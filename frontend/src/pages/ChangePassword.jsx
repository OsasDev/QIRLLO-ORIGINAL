import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { authApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export const ChangePassword = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();

    // If user is not logged in, redirect to login
    if (!user) {
        navigate('/login', { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (currentPassword === newPassword) {
            toast.error('New password must be different from your current password');
            return;
        }

        setLoading(true);

        try {
            await authApi.changePassword(currentPassword, newPassword);

            // Update user object to clear must_change_password flag
            const updatedUser = { ...user, must_change_password: false };
            localStorage.setItem('qirllo_user', JSON.stringify(updatedUser));

            toast.success('Password changed successfully! Redirecting...');

            // Small delay so user sees the success message, then reload to refresh state
            setTimeout(() => {
                window.location.href = `/${user.role}`;
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Change Your Password</h1>
                            <p className="text-sm text-gray-500">Required before you can continue</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                        <p className="text-sm text-amber-800">
                            <strong>Security Notice:</strong> You're using a temporary password. Please set a new password to secure your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="current">Current Password (from your email)</Label>
                            <div className="relative">
                                <Input
                                    id="current"
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    placeholder="Enter your temporary password"
                                    className="h-11 pr-10"
                                    data-testid="current-password-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="new"
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="Choose a strong password"
                                    className="h-11 pr-10"
                                    data-testid="new-password-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">Minimum 6 characters</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirm New Password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Re-enter your new password"
                                className="h-11"
                                data-testid="confirm-password-input"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11"
                            disabled={loading}
                            data-testid="change-password-btn"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Changing Password...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Set New Password
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
