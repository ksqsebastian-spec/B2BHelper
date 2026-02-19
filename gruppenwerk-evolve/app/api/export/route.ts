import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface EmailWithLead {
  id: string;
  subject: string;
  body: string;
  leads: {
    company_name: string;
    contact_email: string;
    contact_name: string | null;
  };
}

// CSV-Zeile escapen
function escapeCsv(value: string | null | undefined): string {
  if (!value) return '';
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }
  return escaped;
}

// Vorname aus vollem Namen extrahieren
function getFirstName(fullName: string | null): string {
  if (!fullName) return '';
  return fullName.split(' ')[0] ?? '';
}

// Nachname aus vollem Namen extrahieren
function getLastName(fullName: string | null): string {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

// CSV-Export im gewählten Format
export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { emailIds, format } = await request.json() as {
    emailIds: string[];
    format: 'instantly' | 'mailchimp' | 'generic';
  };

  if (!emailIds?.length) {
    return NextResponse.json({ error: 'Keine E-Mails ausgewählt' }, { status: 400 });
  }

  // E-Mails mit Lead-Daten laden
  const { data: emails, error } = await supabase
    .from('generated_emails')
    .select('id, subject, body, leads(company_name, contact_email, contact_name)')
    .in('id', emailIds)
    .eq('user_id', user.id);

  if (error || !emails?.length) {
    return NextResponse.json({ error: 'E-Mails konnten nicht geladen werden' }, { status: 500 });
  }

  const typedEmails = emails as unknown as EmailWithLead[];
  let csvContent = '';

  if (format === 'instantly') {
    // Instantly-CSV-Format
    csvContent = 'email,first_name,last_name,company_name,personalized_subject,personalized_body\n';
    csvContent += typedEmails
      .map((email) => {
        const lead = email.leads;
        return [
          escapeCsv(lead.contact_email),
          escapeCsv(getFirstName(lead.contact_name)),
          escapeCsv(getLastName(lead.contact_name)),
          escapeCsv(lead.company_name),
          escapeCsv(email.subject),
          escapeCsv(email.body),
        ].join(',');
      })
      .join('\n');
  } else if (format === 'mailchimp') {
    // Mailchimp-CSV-Format
    csvContent = 'Email Address,First Name,Last Name,MERGE3,MERGE4,MERGE5\n';
    csvContent += typedEmails
      .map((email) => {
        const lead = email.leads;
        return [
          escapeCsv(lead.contact_email),
          escapeCsv(getFirstName(lead.contact_name)),
          escapeCsv(getLastName(lead.contact_name)),
          escapeCsv(lead.company_name),
          escapeCsv(email.subject),
          escapeCsv(email.body),
        ].join(',');
      })
      .join('\n');
  } else {
    // Generisches CSV-Format
    csvContent = 'email,contact_name,company_name,subject,body\n';
    csvContent += typedEmails
      .map((email) => {
        const lead = email.leads;
        return [
          escapeCsv(lead.contact_email),
          escapeCsv(lead.contact_name),
          escapeCsv(lead.company_name),
          escapeCsv(email.subject),
          escapeCsv(email.body),
        ].join(',');
      })
      .join('\n');
  }

  // E-Mails als exportiert markieren
  await supabase
    .from('generated_emails')
    .update({ status: 'exported', exported_at: new Date().toISOString() })
    .in('id', emailIds)
    .eq('user_id', user.id);

  // CSV als Download-Response zurückgeben
  const fileName = `export-${format}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
