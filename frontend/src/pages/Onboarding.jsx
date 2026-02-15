import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolApi, authApi, classesApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
    Loader2, School, UserPlus, BookOpen, CheckCircle2,
    ChevronRight, ChevronLeft, Upload, X
} from 'lucide-react';

const STEPS = [
    { id: 1, title: 'School Profile', icon: School, desc: 'Tell us about your school' },
    { id: 2, title: 'Admin Account', icon: UserPlus, desc: 'Create the administrator' },
    { id: 3, title: 'Classes', icon: BookOpen, desc: 'Set up your classes' },
    { id: 4, title: 'All Done', icon: CheckCircle2, desc: 'Ready to go!' },
];

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
const SECTIONS = ['A', 'B', 'C', 'D'];

export const Onboarding = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: School Profile
    const [school, setSchool] = useState({
        school_name: '', motto: '', address: '', phone: '', email: '',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    // Step 2: Admin Account
    const [admin, setAdmin] = useState({
        full_name: '', email: '', password: '', confirmPassword: '', phone: '',
    });

    // Step 3: Classes
    const [classes, setClasses] = useState([]);
    const [newClass, setNewClass] = useState({ level: 'JSS1', section: 'A' });

    // Result data
    const [adminEmail, setAdminEmail] = useState('');

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setLogoPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const addClass = () => {
        const name = `${newClass.level} ${newClass.section}`;
        if (classes.find(c => c.name === name)) {
            toast.error('This class already exists');
            return;
        }
        setClasses([...classes, {
            name, level: newClass.level, section: newClass.section, academic_year: '2025/2026'
        }]);
    };

    const removeClass = (name) => {
        setClasses(classes.filter(c => c.name !== name));
    };

    const addAllClasses = () => {
        const allClasses = CLASS_LEVELS.map(level => ({
            name: `${level} A`, level, section: 'A', academic_year: '2025/2026',
        }));
        setClasses(allClasses);
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            if (!school.school_name.trim()) {
                toast.error('School name is required');
                return;
            }
            setLoading(true);
            try {
                // Save school settings
                await schoolApi.setup(school);

                // Upload logo if provided
                if (logoFile) {
                    try {
                        // We need auth for logo upload, will do it after admin creation
                    } catch (e) { /* logo upload will happen after admin account */ }
                }
                setCurrentStep(2);
            } catch (err) {
                toast.error(err.response?.data?.detail || 'Failed to save school settings');
            } finally {
                setLoading(false);
            }
        } else if (currentStep === 2) {
            if (!admin.full_name.trim() || !admin.email.trim() || !admin.password) {
                toast.error('Please fill in all required fields');
                return;
            }
            if (admin.password.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
            }
            if (admin.password !== admin.confirmPassword) {
                toast.error('Passwords do not match');
                return;
            }
            setLoading(true);
            try {
                await authApi.register({
                    full_name: admin.full_name,
                    email: admin.email,
                    password: admin.password,
                    role: 'admin',
                    phone: admin.phone || null,
                });
                setAdminEmail(admin.email);

                // Now upload logo if it was provided in step 1
                if (logoFile) {
                    try {
                        await schoolApi.uploadLogo(logoFile);
                    } catch (e) { /* silently fail logo upload */ }
                }

                setCurrentStep(3);
            } catch (err) {
                toast.error(err.response?.data?.detail || 'Failed to create admin account');
            } finally {
                setLoading(false);
            }
        } else if (currentStep === 3) {
            setLoading(true);
            try {
                // Create all classes
                for (const cls of classes) {
                    await classesApi.create(cls);
                }
                setCurrentStep(4);
            } catch (err) {
                toast.error(err.response?.data?.detail || 'Failed to create classes');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleFinish = () => {
        // Clear auth state so they go to fresh login
        localStorage.removeItem('qirllo_token');
        localStorage.removeItem('qirllo_user');
        navigate('/login');
    };

    return (
        <div className="onboarding-container">
            {/* Stepper */}
            <div className="onboarding-stepper">
                <div className="stepper-logo">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <span className="text-white font-bold text-xl">Q</span>
                    </div>
                    <span className="text-lg font-bold">QIRLLO Setup</span>
                </div>
                <div className="stepper-steps">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isComplete = currentStep > step.id;
                        return (
                            <div key={step.id} className={`stepper-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
                                <div className="step-indicator">
                                    {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <div className="step-text">
                                    <span className="step-title">{step.title}</span>
                                    <span className="step-desc">{step.desc}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="onboarding-content">
                <div className="onboarding-card">
                    {/* Step 1: School Profile */}
                    {currentStep === 1 && (
                        <>
                            <h2 className="text-2xl font-bold mb-1">School Profile</h2>
                            <p className="text-muted-foreground mb-8">Let's set up your school's identity</p>

                            <div className="space-y-5">
                                {/* Logo Upload */}
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="logo-upload-zone" onClick={() => document.getElementById('logo-input').click()}>
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                                <Upload className="w-6 h-6" />
                                                <span className="text-xs">Upload Logo</span>
                                            </div>
                                        )}
                                        <input id="logo-input" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                    </div>
                                    <div>
                                        <p className="font-medium">School Logo</p>
                                        <p className="text-sm text-muted-foreground">PNG or JPG, shown on dashboards & reports</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="school_name">School Name *</Label>
                                    <Input id="school_name" placeholder="e.g. Greenfield International School" className="h-11"
                                        value={school.school_name} onChange={(e) => setSchool({ ...school, school_name: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="motto">School Motto</Label>
                                    <Input id="motto" placeholder="e.g. Excellence in Knowledge" className="h-11"
                                        value={school.motto} onChange={(e) => setSchool({ ...school, motto: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="school_phone">Phone</Label>
                                        <Input id="school_phone" placeholder="+234 801 234 5678" className="h-11"
                                            value={school.phone} onChange={(e) => setSchool({ ...school, phone: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="school_email">Email</Label>
                                        <Input id="school_email" type="email" placeholder="info@school.com" className="h-11"
                                            value={school.email} onChange={(e) => setSchool({ ...school, email: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input id="address" placeholder="15 Education Lane, Lagos" className="h-11"
                                        value={school.address} onChange={(e) => setSchool({ ...school, address: e.target.value })} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 2: Admin Account */}
                    {currentStep === 2 && (
                        <>
                            <h2 className="text-2xl font-bold mb-1">Administrator Account</h2>
                            <p className="text-muted-foreground mb-8">Create the school's primary administrator</p>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="admin_name">Full Name *</Label>
                                    <Input id="admin_name" placeholder="Mrs. Adebayo Folake" className="h-11"
                                        value={admin.full_name} onChange={(e) => setAdmin({ ...admin, full_name: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="admin_email">Email *</Label>
                                        <Input id="admin_email" type="email" placeholder="admin@school.com" className="h-11"
                                            value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="admin_phone">Phone</Label>
                                        <Input id="admin_phone" placeholder="+234 801 234 5678" className="h-11"
                                            value={admin.phone} onChange={(e) => setAdmin({ ...admin, phone: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="admin_password">Password *</Label>
                                        <Input id="admin_password" type="password" placeholder="Min 6 characters" className="h-11"
                                            value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="admin_confirm">Confirm Password *</Label>
                                        <Input id="admin_confirm" type="password" placeholder="Re-enter password" className="h-11"
                                            value={admin.confirmPassword} onChange={(e) => setAdmin({ ...admin, confirmPassword: e.target.value })} />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                                    <p className="font-medium">💡 This will be the main admin account</p>
                                    <p>You can add more teachers and staff from the dashboard after setup.</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 3: Classes */}
                    {currentStep === 3 && (
                        <>
                            <h2 className="text-2xl font-bold mb-1">Set Up Classes</h2>
                            <p className="text-muted-foreground mb-6">Add your school's classes. You can always add more later.</p>

                            <div className="space-y-5">
                                <div className="flex items-end gap-3">
                                    <div className="space-y-2 flex-1">
                                        <Label>Level</Label>
                                        <select className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                                            value={newClass.level} onChange={(e) => setNewClass({ ...newClass, level: e.target.value })}>
                                            {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Label>Section</Label>
                                        <select className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                                            value={newClass.section} onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}>
                                            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <Button onClick={addClass} className="h-11">Add</Button>
                                </div>

                                <Button variant="outline" className="w-full" onClick={addAllClasses}>
                                    Add All Standard Classes (JSS1-SS3 Section A)
                                </Button>

                                {classes.length > 0 && (
                                    <div className="class-chips">
                                        {classes.map(cls => (
                                            <div key={cls.name} className="class-chip">
                                                <span>{cls.name}</span>
                                                <button onClick={() => removeClass(cls.name)} className="text-muted-foreground hover:text-foreground">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {classes.length === 0 && (
                                    <div className="p-4 bg-amber-50 rounded-lg text-sm text-amber-800">
                                        <p>No classes added yet. You can skip this and add them from the dashboard.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Step 4: Done */}
                    {currentStep === 4 && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Your School is Ready!</h2>
                            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                                {school.school_name} has been set up successfully. You can now log in to your dashboard.
                            </p>

                            <div className="p-6 bg-muted rounded-xl text-left max-w-sm mx-auto mb-8">
                                <p className="font-semibold mb-3">Your Login Credentials</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Email:</span>
                                        <span className="font-medium">{adminEmail}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Classes:</span>
                                        <span className="font-medium">{classes.length} created</span>
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleFinish} size="lg" className="h-12 px-8">
                                Go to Login
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {currentStep < 4 && (
                        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
                            <div>
                                {currentStep > 1 && (
                                    <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)} disabled={loading}>
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                )}
                            </div>
                            <Button onClick={handleNext} disabled={loading} className="h-11 px-6">
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : currentStep === 3 ? (
                                    classes.length > 0 ? (
                                        <><span>Create Classes & Finish</span> <ChevronRight className="w-4 h-4 ml-1" /></>
                                    ) : (
                                        <><span>Skip & Finish</span> <ChevronRight className="w-4 h-4 ml-1" /></>
                                    )
                                ) : (
                                    <><span>Continue</span> <ChevronRight className="w-4 h-4 ml-1" /></>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
