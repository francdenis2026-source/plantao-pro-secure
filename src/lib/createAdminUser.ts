import { supabase } from '@/integrations/supabase/client';

/**
 * Creates the admin user if it doesn't exist
 * Email: francdenisbr@gmail.com
 * Password: franc2015
 */
export async function createAdminUserIfNotExists(): Promise<{ success: boolean; message: string }> {
  const adminEmail = 'francdenisbr@gmail.com';
  const adminPassword = 'franc2015';
  
  try {
    // First check if user already exists by trying to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    
    if (signInData?.user) {
      // User exists, sign out and return
      await supabase.auth.signOut();
      return { success: true, message: 'Admin já existe' };
    }
    
    // If sign in failed with invalid credentials, user might exist with different password
    if (signInError?.message?.includes('Invalid login credentials')) {
      // Try to check if email exists via password reset
      return { success: false, message: 'Admin pode existir com senha diferente' };
    }
    
    // Create the admin user
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: 'Administrador',
          is_admin: true,
        },
      },
    });
    
    if (error) {
      console.error('Error creating admin:', error);
      return { success: false, message: error.message };
    }
    
    if (data?.user) {
      // Add admin role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: 'admin',
      });
      
      if (roleError) {
        console.error('Error adding admin role:', roleError);
      }
      
      // Sign out after creation
      await supabase.auth.signOut();
      
      return { success: true, message: 'Admin criado com sucesso' };
    }
    
    return { success: false, message: 'Falha ao criar admin' };
  } catch (err) {
    console.error('Error in createAdminUser:', err);
    return { success: false, message: String(err) };
  }
}
