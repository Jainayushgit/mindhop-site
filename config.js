/* Young Turings booking config: the only file to edit when accounts change. */
window.YT = {
  SITE: 'https://youngturings.com',
  // Cal.com event path, e.g. 'young-turings/free-class'
  CAL_LINK: 'REPLACE_CAL_LINK',
  // Supabase (Young Turings / former Mindhop project). The publishable key is safe in the browser; RLS protects data.
  SUPABASE_URL: 'REPLACE_SUPABASE_URL',
  SUPABASE_KEY: 'REPLACE_SUPABASE_PUBLISHABLE_KEY',
  WHATSAPP: '916363575529',
  STATUSES: ['new', 'called', 'link_sent', 'booked', 'showed', 'paid', 'lost'],
  STATUS_LABEL: { new: 'New', called: 'Called', link_sent: 'Link sent', booked: 'Booked', showed: 'Showed', paid: 'Paid', lost: 'Lost' },
  // Column names in the leads table
  COL: { id: 'id', parent: 'parent_name', phone: 'phone', child: 'child_name', status: 'status', created: 'created_at', notes: 'notes', booking: 'booking_start' }
};
