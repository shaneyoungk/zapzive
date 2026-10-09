import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-auth';
import { ZapziveLogo } from '@/components/ui/ZapziveLogo';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const loginMutation = useLogin();

    const from = location.state?.from?.pathname || "/dashboard";

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const validateField = (field: string, value: string) => {
        switch (field) {
            case 'email':
                return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email address' : '';
            case 'password':
                return value.length < 1 ? 'Password is required' : '';
            default:
                return '';
        }
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        const error = validateField(field, formData[field as keyof typeof formData]);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (touched[field]) {
            const error = validateField(field, value);
            setErrors(prev => ({ ...prev, [field]: error }));
        }
    };

    const getFieldStatus = (field: string) => {
        if (!touched[field]) return 'default';
        if (errors[field]) return 'error';
        if (formData[field as keyof typeof formData]) return 'success';
        return 'default';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const emailError = validateField('email', formData.email);
        const passwordError = validateField('password', formData.password);

        if (emailError || passwordError) {
            setErrors({ email: emailError, password: passwordError });
            setTouched({ email: true, password: true });
            return;
        }

        loginMutation.mutate(formData, {
            onSuccess: () => {
                navigate(from, { replace: true });
            }
        });
    };


    return (
        <div className="public-page auth-page min-h-screen flex items-center justify-center bg-[#f5f3ee] px-5 py-24 selection:bg-[#b9d9cc]">

            <motion.div
                initial={false}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={false}
                        className="flex justify-center mb-6"
                    >
                        <Link to="/" className="auth-brand" aria-label="Zapzive home"><ZapziveLogo size="md" /></Link>
                    </motion.div>
                    <p className="mono-label mb-4 text-[#087f5b]">Secure workspace access</p>
                    <h1 className="text-4xl font-semibold text-[#20211e] mb-3 tracking-[-.055em]">
                        Welcome back
                    </h1>
                    <p className="text-zinc-400 text-lg">Sign in to continue to your test workspace.</p>
                </div>

                {/* Login Form */}
                <motion.div
                    initial={false}
                    className="premium-card p-7 sm:p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <Label htmlFor="email" className="text-zinc-300 mb-2 block font-medium">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@company.com"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    onBlur={() => handleBlur('email')}
                                    className={`pl-11 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 transition-colors ${getFieldStatus('email') === 'error' ? 'border-red-500 focus:border-red-500' :
                                        getFieldStatus('email') === 'success' ? 'border-emerald-500/50' : ''
                                        }`}
                                />
                                {getFieldStatus('email') === 'success' && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                                {getFieldStatus('email') === 'error' && (
                                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                                )}
                            </div>
                            {touched.email && errors.email && (
                                <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="password" className="text-zinc-300 font-medium">
                                    Password
                                </Label>
                            <Link to="/contact" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    onBlur={() => handleBlur('password')}
                                    className={`pl-11 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 transition-colors ${getFieldStatus('password') === 'error' ? 'border-red-500 focus:border-red-500' :
                                        getFieldStatus('password') === 'success' ? 'border-emerald-500/50' : ''
                                        }`}
                                />
                                {getFieldStatus('password') === 'success' && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                                {getFieldStatus('password') === 'error' && (
                                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                                )}
                            </div>
                            {touched.password && errors.password && (
                                <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="w-full bg-[#183a30] hover:bg-[#11a879] text-[#f5f3ee] hover:text-[#20211e] font-semibold py-6 rounded-[10px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loginMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    Signing In...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Sign In
                                    <ArrowRight className="w-5 h-5" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Signup Link */}
                    <div className="mt-6 text-center">
                        <p className="text-zinc-400">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </motion.div>

                {/* Demo Credentials */}
                <motion.div
                    initial={false}
                    className="auth-demo mt-6 rounded-[14px] border border-[#cdd8c8] bg-[#e8eee4] p-4 shadow-sm"
                >
                    <p className="text-zinc-400 text-sm text-center mb-2 font-medium">Demo Credentials</p>
                    <div className="flex flex-col gap-1">
                        <p className="text-zinc-500 text-xs text-center">
                            <span className="text-zinc-400">Email:</span> demo@zapzive.com
                        </p>
                        <p className="text-zinc-500 text-xs text-center">
                            <span className="text-zinc-400">Password:</span> password123
                        </p>
                    </div>

                </motion.div>
            </motion.div>
        </div>
    );
}

