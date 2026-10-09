import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Building2, Globe, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignup } from '@/hooks/use-auth';
import { ZapziveLogo } from '@/components/ui/ZapziveLogo';

export default function Signup() {
    const navigate = useNavigate();
    const signupMutation = useSignup();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        country: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const validateField = (field: string, value: string) => {
        switch (field) {
            case 'name':
                return value.trim().length < 2 ? 'Name must be at least 2 characters' : '';
            case 'email':
                return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email address' : '';
            case 'password':
                if (value.length < 12) return 'Password must be at least 12 characters';
                if (!/[A-Za-z]/.test(value)) return 'Password must contain a letter';
                if (!/(?=.*\d)/.test(value)) return 'Password must contain a number';
                return '';
            case 'confirmPassword':
                return value !== formData.password ? 'Passwords do not match' : '';
            case 'companyName':
                return value.trim().length < 2 ? 'Company name is required' : '';
            case 'country':
                return value.trim().length < 2 ? 'Country is required' : '';
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

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        Object.keys(formData).forEach(field => {
            const error = validateField(field, formData[field as keyof typeof formData]);
            if (error) newErrors[field] = error;
        });
        setErrors(newErrors);
        setTouched({
            name: true,
            email: true,
            password: true,
            confirmPassword: true,
            companyName: true,
            country: true
        });
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        signupMutation.mutate({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            companyName: formData.companyName,
            country: formData.country
        });
    };

    const getFieldStatus = (field: string) => {
        if (!touched[field]) return 'default';
        if (errors[field]) return 'error';
        if (formData[field as keyof typeof formData]) return 'success';
        return 'default';
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
                    <p className="mono-label mb-4 text-[#087f5b]">Create your finance workspace</p>
                    <h1 className="text-4xl font-semibold text-[#20211e] mb-3 tracking-[-.055em]">
                        Create your account
                    </h1>
                    <p className="text-zinc-400 text-lg">Create a workspace to explore Zapzive with test data.</p>
                </div>

                {/* Signup Form */}
                <motion.div
                    initial={false}
                    className="premium-card p-7 sm:p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <Label htmlFor="name" className="text-zinc-300 mb-2 block font-medium">
                                Full Name *
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    onBlur={() => handleBlur('name')}
                                    className={`pl-11 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 transition-colors ${getFieldStatus('name') === 'error' ? 'border-red-500 focus:border-red-500' :
                                        getFieldStatus('name') === 'success' ? 'border-emerald-500/50' : ''
                                        }`}
                                />
                                {getFieldStatus('name') === 'success' && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                                {getFieldStatus('name') === 'error' && (
                                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                                )}
                            </div>
                            {touched.name && errors.name && (
                                <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <Label htmlFor="email" className="text-zinc-300 mb-2 block font-medium">
                                Email Address *
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
                            <Label htmlFor="password" className="text-zinc-300 mb-2 block font-medium">
                                Password *
                            </Label>
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
                            {!errors.password && formData.password && (
                                <p className="text-zinc-500 text-xs mt-1.5">
                                    Strong password · 12+ characters with a letter and number
                                </p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <Label htmlFor="confirmPassword" className="text-zinc-300 mb-2 block font-medium">
                                Confirm Password *
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    onBlur={() => handleBlur('confirmPassword')}
                                    className={`pl-11 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 transition-colors ${getFieldStatus('confirmPassword') === 'error' ? 'border-red-500 focus:border-red-500' :
                                        getFieldStatus('confirmPassword') === 'success' ? 'border-emerald-500/50' : ''
                                        }`}
                                />
                                {getFieldStatus('confirmPassword') === 'success' && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                                {getFieldStatus('confirmPassword') === 'error' && (
                                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                                )}
                            </div>
                            {touched.confirmPassword && errors.confirmPassword && (
                                <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.confirmPassword}
                                </p>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-zinc-800 pt-5">
                            <p className="text-zinc-400 text-sm mb-4">Company Information</p>
                        </div>

                        {/* Company Name */}
                        <div>
                            <Label htmlFor="companyName" className="text-zinc-300 mb-2 block font-medium">
                                Company Name *
                            </Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <Input
                                    id="companyName"
                                    type="text"
                                    placeholder="Acme Inc."
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    onBlur={() => handleBlur('companyName')}
                                    className={`pl-11 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 transition-colors ${getFieldStatus('companyName') === 'error' ? 'border-red-500 focus:border-red-500' :
                                        getFieldStatus('companyName') === 'success' ? 'border-emerald-500/50' : ''
                                        }`}
                                />
                                {getFieldStatus('companyName') === 'success' && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                                {getFieldStatus('companyName') === 'error' && (
                                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                                )}
                            </div>
                            {touched.companyName && errors.companyName && (
                                <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.companyName}
                                </p>
                            )}
                        </div>

                        {/* Country */}
                        <div>
                            <Label htmlFor="country" className="text-zinc-300 mb-2 block font-medium">
                                Country *
                            </Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <Input
                                    id="country"
                                    type="text"
                                    placeholder="United States"
                                    value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                    onBlur={() => handleBlur('country')}
                                    className={`pl-11 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 transition-colors ${getFieldStatus('country') === 'error' ? 'border-red-500 focus:border-red-500' :
                                        getFieldStatus('country') === 'success' ? 'border-emerald-500/50' : ''
                                        }`}
                                />
                                {getFieldStatus('country') === 'success' && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                                {getFieldStatus('country') === 'error' && (
                                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                                )}
                            </div>
                            {touched.country && errors.country && (
                                <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors.country}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={signupMutation.isPending}
                            className="w-full bg-[#183a30] hover:bg-[#11a879] text-[#f5f3ee] hover:text-[#20211e] font-semibold py-6 rounded-[10px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {signupMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    Creating Account...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Create Account
                                    <ArrowRight className="w-5 h-5" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-zinc-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </motion.div>

                {/* Terms */}
                <p className="text-center text-zinc-500 text-sm mt-6">
                    By creating an account, you agree to our{' '}
                    <Link to="/terms" className="text-zinc-400 hover:text-white transition-colors underline">
                        Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors underline">
                        Privacy Policy
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}

