-- Create a trigger to automatically assign admin role for the specific admin email
CREATE OR REPLACE FUNCTION public.handle_admin_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new user has the admin email, assign admin role
  IF NEW.email = 'brahimsolo648@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_user_creation();