import React from 'react';
import { Link } from 'wouter';
import { Github, Mail, MessageSquare, FileText, Crown } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4">IB Math Tutor</h3>
            <p className="text-slate-400 mb-4 max-w-md">
              Advanced AI-powered mathematics tutoring for IB students. Get personalized help with complex mathematical concepts, 
              interactive visualizations, and comprehensive paper generation.
            </p>
            <div className="flex space-x-4">
              <a href="mailto:support@ibmathtutor.com" className="text-slate-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="https://github.com" className="text-slate-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/tutor" className="text-slate-400 hover:text-white transition-colors flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Tutor
                </Link>
              </li>
              <li>
                <Link href="/papers" className="text-slate-400 hover:text-white transition-colors flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Paper Generator
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-slate-400 hover:text-white transition-colors flex items-center">
                  <Crown className="w-4 h-4 mr-2" />
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="/help" className="text-slate-400 hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-400 text-sm">
            © {currentYear} IB Math Tutor. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="text-slate-500 text-sm">Made with ❤️ for IB Students</span>
          </div>
        </div>
      </div>
    </footer>
  );
}