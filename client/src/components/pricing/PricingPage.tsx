import React, { useState, useEffect } from 'react';
import { Check, Star, Zap, Calculator, Brain, BookOpen, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchPlans, createCheckoutSession, type StripePlan } from '@/utils/stripeClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch plans on component mount
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setIsLoadingPlans(true);
        setError(null);
        const fetchedPlans = await fetchPlans();
        setPlans(fetchedPlans);
        
        // Check if any paid plans are missing stripePriceId
        const missingStripeIds = fetchedPlans.filter(plan => 
          plan.price > 0 && plan.interval !== "lifetime" && !plan.stripePriceId
        );
        
        if (missingStripeIds.length > 0) {
          console.warn('Some plans are missing Stripe price IDs:', missingStripeIds);
        }
      } catch (error: any) {
        console.error('Failed to load plans:', error);
        setError(error.message);
        toast({
          title: "Failed to Load Plans",
          description: "Unable to load pricing plans. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPlans(false);
      }
    };

    loadPlans();
  }, [toast]);

  const handlePlanSelect = async (plan: StripePlan) => {
    if (plan.id === 'free') {
      toast({
        title: "Free Plan Selected",
        description: "You're already on the free plan!",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upgrade your plan",
        variant: "destructive",
      });
      return;
    }

    if (!plan.stripePriceId) {
      toast({
        title: "Plan Not Available",
        description: "This plan is not available for purchase at the moment. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const checkoutUrl = await createCheckoutSession({
        priceId: plan.stripePriceId,
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/cancel`,
      });

      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Unable to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIconForFeature = (feature: string) => {
    if (feature.includes('AI') || feature.includes('tutor')) return <Brain className="w-4 h-4" />;
    if (feature.includes('math') || feature.includes('tools')) return <Calculator className="w-4 h-4" />;
    if (feature.includes('paper') || feature.includes('generation')) return <BookOpen className="w-4 h-4" />;
    if (feature.includes('support')) return <HelpCircle className="w-4 h-4" />;
    if (feature.includes('fast') || feature.includes('priority')) return <Zap className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  const formatInterval = (interval: string) => {
    switch (interval) {
      case 'hourly': return 'hour';
      case 'monthly': return 'month';
      case 'yearly': return 'year';
      case 'lifetime': return 'lifetime';
      default: return interval;
    }
  };

  if (isLoadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Failed to Load Plans</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl opacity-40 animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-indigo-200/40 rounded-full blur-2xl opacity-30 animate-pulse delay-700" />
      </div>
  
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
            Choose Your <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI Tutor Plan</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Unlock the full potential of AI-powered mathematics tutoring.  
            Pick the plan that grows with your learning journey.
          </p>
        </div>
  
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-24">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl shadow-lg border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 backdrop-blur-sm ${
                plan.popular
                  ? "border-blue-600 bg-white/80"
                  : "border-gray-200 bg-white/70"
              } ${!plan.stripePriceId && plan.id !== 'free' ? 'opacity-60' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-full text-xs font-semibold tracking-wide shadow-md">
                    ⭐ {plan.badge}
                  </span>
                </div>
              )}
  
              <div className="p-8 flex flex-col h-full">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-500 text-sm">{plan.description}</p>
                </div>
  
                {/* Price */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-extrabold text-gray-900">
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="ml-2 text-gray-500">
                        /{formatInterval(plan.interval)}
                      </span>
                    )}
                  </div>
                  {plan.limit && (
                    <p className="text-sm text-gray-500 mt-2">
                      {plan.limit === 2500 ? 'Unlimited' : plan.limit} questions / {formatInterval(plan.interval)}
                    </p>
                  )}
                </div>
  
                {/* Features */}
                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIconForFeature(feature)}
                      </div>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
  
                {/* Action Button */}
                <div className="mt-auto">
                  {plan.id === 'free' ? (
                    <Button
                      onClick={() => handlePlanSelect(plan)}
                      className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                      disabled={isLoading}
                    >
                      Current Plan
                    </Button>
                  ) : !plan.stripePriceId ? (
                    <Button
                      className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePlanSelect(plan)}
                      className={`w-full ${
                        plan.popular
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      } text-white`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
  
        {/* FAQ Section */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-12">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              {
                q: "Can I change my plan anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
              {
                q: "What happens if I reach my question limit?",
                a: "You'll be notified when you're close to your limit. You can upgrade your plan to continue learning.",
              },
              {
                q: "Is there a free trial?",
                a: "Yes! Every new user gets 5 free questions to experience our AI tutor before subscribing.",
              },
              {
                q: "Can I cancel my subscription?",
                a: "Absolutely. You can cancel anytime and continue using your plan until the end of your billing period.",
              },
            ].map((item, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {item.q}
                </h3>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;