import { LifeDashboard } from "@/components/dashboard/LifeDashboard"
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getItems } from '@/lib/services/items.service';
import { User } from "@/types/user";

export default async function Home() {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: items, error } = await getItems();

  if (error) {
    console.error('Erro ao buscar dados:', error);
    return <div>Erro ao carregar dados.</div>;
  }
   
  return (
    <main className="min-h-screen bg-background">
      <LifeDashboard initialItems={items || []} user={user as User}/>
    </main>
  )
}
