import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { seedApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate(`/${user.role}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const response = await seedApi.seed();
      toast.success('Sample data created! You can now login.');
      setEmail('admin@qirllo.com');
      setPassword('admin123');
    } catch (error) {
      if (error.response?.data?.message?.includes('already seeded')) {
        toast.info('Database already has sample data');
        setEmail('admin@qirllo.com');
        setPassword('admin123');
      } else {
        toast.error('Failed to seed data');
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="login-split">
      {/* Hero Image (Desktop only) */}
      <div className="login-hero">
        <img
          src="https://images.pexels.com/photos/5211472/pexels-photo-5211472.jpeg"
          alt="Nigerian students in classroom"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 z-10">
          <h2 className="text-4xl font-bold text-white mb-4">
            Empowering Nigerian Schools
          </h2>
          <p className="text-white/90 text-lg max-w-md">
            Complete school management solution for the modern Nigerian educational system.
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-2xl">Q</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">QIRLLO</h1>
              <p className="text-sm text-muted-foreground">School Management</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">
            Enter your credentials to access your dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-primary hover:underline">Forgot password?</a>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-center text-sm text-muted-foreground mb-4">
              First time? Load sample data to explore
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSeedData}
              disabled={seeding}
              data-testid="seed-data-btn"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading sample data...
                </>
              ) : (
                'Load Nigerian School Sample Data'
              )}
            </Button>
            
            <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Demo Credentials:</p>
              <p className="text-muted-foreground">Admin: admin@qirllo.com / admin123</p>
              <p className="text-muted-foreground">Teacher: okonkwo@qirllo.com / teacher123</p>
              <p className="text-muted-foreground">Parent: ojo@gmail.com / parent123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
