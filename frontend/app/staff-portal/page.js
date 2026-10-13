import { redirect } from 'next/navigation';

export default function StaffPortalRedirect() {
  redirect('/admin/login');
}
