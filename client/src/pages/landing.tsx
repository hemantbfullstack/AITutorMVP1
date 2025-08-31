import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import MainLayout from "@/components/layout/MainLayout";

export default function Landing() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <MainLayout showNavbar={false} showFooter={false}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-graduation-cap text-white text-sm"></i>
            </div>
            <span className="text-xl font-semibold text-slate-900">AI Tutor</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-blue-700">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-6">
            Master IB Mathematics with
            <span className="text-primary block">AI-Powered Tutoring</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Get personalized, step-by-step help for IB Math AA and AI with our advanced AI tutor. 
            Complete with interactive tools, voice assistance, and comprehensive practice materials.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button size="lg" asChild className="bg-primary hover:bg-blue-700 text-lg px-8 py-4">
              <Link href="/signup">Start Learning Now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-4">
              <Link href="/login">Already have an account?</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-robot text-primary text-xl"></i>
              </div>
              <CardTitle>AI Tutor Chat</CardTitle>
              <CardDescription>
                Interactive conversations with an AI tutor specialized in IB Mathematics AA and AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Step-by-step problem solving</li>
                <li>• LaTeX math rendering</li>
                <li>• Authentic IB teaching style</li>
                <li>• Session history and replay</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-calculator text-accent text-xl"></i>
              </div>
              <CardTitle>Math Tools</CardTitle>
              <CardDescription>
                Comprehensive suite of mathematical tools integrated with your learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Scientific calculator</li>
                <li>• Interactive graphing</li>
                <li>• Wolfram Alpha integration</li>
                <li>• Seamless chat integration</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-volume-up text-warning text-xl"></i>
              </div>
              <CardTitle>Voice Assistant</CardTitle>
              <CardDescription>
                Natural text-to-speech for enhanced learning accessibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• High-quality TTS</li>
                <li>• Auto-play options</li>
                <li>• Volume controls</li>
                <li>• Multiple voice options</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Excel in IB Mathematics?
          </h2>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of students who have improved their understanding and grades with our AI-powered tutoring platform.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-blue-700 text-lg px-8 py-4"
          >
            Get Started Free
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-graduation-cap text-white text-sm"></i>
              </div>
              <span className="text-xl font-semibold">AI Tutor</span>
            </div>
            <p className="text-slate-400">
              Empowering students to master IB Mathematics with AI-powered learning tools.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </MainLayout>
  );
}
