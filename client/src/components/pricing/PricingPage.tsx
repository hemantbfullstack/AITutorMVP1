import React, { useState, useEffect } from "react";
import {
  Check,
  Star,
  Zap,
  Calculator,
  Brain,
  BookOpen,
  HelpCircle,
  Loader2,
  Image,
  Volume2,
  Users,
  Sparkles,
  Crown,
  Shield,
  Rocket,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPlans,
  createCheckoutSession,
  type StripePlan,
} from "@/utils/stripeClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addOnPlans, Plan, plans } from "@shared/constants";

const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
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
        const missingStripeIds = fetchedPlans.filter(
          (plan) =>
            plan.price > 0 &&
            plan.interval !== "lifetime" &&
            !plan.stripePriceId
        );

        if (missingStripeIds.length > 0) {
          console.warn(
            "Some plans are missing Stripe price IDs:",
            missingStripeIds
          );
        }
      } catch (error: any) {
        console.error("Failed to load plans:", error);
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
    if (plan.id === "free") {
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
        description:
          "This plan is not available for purchase at the moment. Please contact support.",
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
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description:
          error.message ||
          "Unable to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIconForFeature = (feature: string) => {
    if (feature.includes("AI") || feature.includes("tutor"))
      return <Brain className="w-4 h-4 text-blue-600" />;
    if (feature.includes("math") || feature.includes("tools"))
      return <Calculator className="w-4 h-4 text-green-600" />;
    if (feature.includes("paper") || feature.includes("generation"))
      return <BookOpen className="w-4 h-4 text-purple-600" />;
    if (feature.includes("support")) return <HelpCircle className="w-4 h-4 text-orange-600" />;
    if (feature.includes("fast") || feature.includes("priority"))
      return <Zap className="w-4 h-4 text-yellow-600" />;
    if (feature.includes("image") || feature.includes("diagram"))
      return <Image className="w-4 h-4 text-pink-600" />;
    if (feature.includes("voice") || feature.includes("speech"))
      return <Volume2 className="w-4 h-4 text-indigo-600" />;
    if (feature.includes("group") || feature.includes("students"))
      return <Users className="w-4 h-4 text-teal-600" />;
    return <Check className="w-4 h-4 text-green-500" />;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "free":
        return <Target className="w-8 h-8 text-gray-600" />;
      case "basic":
        return <Rocket className="w-8 h-8 text-blue-600" />;
      case "standard":
        return <Star className="w-8 h-8 text-yellow-600" />;
      case "pro":
        return <Crown className="w-8 h-8 text-purple-600" />;
      case "institution":
        return <Shield className="w-8 h-8 text-indigo-600" />;
      default:
        return <Sparkles className="w-8 h-8 text-gray-600" />;
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "INR") {
      return `₹${price}`;
    }
    return `$${price}`;
  };

  const formatInterval = (interval: string) => {
    switch (interval) {
      case "hourly":
        return "hour";
      case "monthly":
        return "month";
      case "yearly":
        return "year";
      case "lifetime":
        return "lifetime";
      default:
        return interval;
    }
  };

  if (isLoadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin mx-auto" style={{ animationDelay: '-0.5s' }}></div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Loading amazing plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-2xl">
          <CardHeader>
            <CardTitle className="text-red-600">Failed to Load Plans</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Enhanced Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-200/30 to-indigo-300/30 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-gradient-to-tl from-purple-200/30 to-pink-300/30 rounded-full blur-2xl opacity-50 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-green-200/20 to-blue-300/20 rounded-full blur-xl opacity-40 animate-pulse delay-500" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-24 px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-medium mb-6 shadow-lg">
            <Sparkles className="w-4 h-4" />
            New Pricing Plans Available
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI Tutor Plan
            </span>
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Unlock the full potential of AI-powered mathematics tutoring. Pick the plan that grows with your learning journey.
          </p>
        </div>

        {/* Enhanced Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-32">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl transition-all duration-700 ease-out transform flex flex-col h-full min-h-[600px] ${
                hoveredPlan === plan.id ? 'scale-105 shadow-2xl' : 'scale-100 shadow-lg'
              } ${
                plan.popular
                  ? "border-2 border-blue-500 bg-gradient-to-br from-white to-blue-50 shadow-2xl shadow-blue-500/25"
                  : "border border-gray-200 bg-white/95 hover:shadow-2xl"
              } ${!plan.stripePriceId && plan.id !== "free" ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards',
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full text-sm font-bold tracking-wide shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-300 flex items-center justify-center space-x-2">
                    <Star className="w-4 h-4" />
                    <span>{plan.badge}</span>
                  </div>
                </div>
              )}

              {/* Plan Icon */}
              <div className="text-center mb-6 pt-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
                  {getPlanIcon(plan.id)}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 px-2">{plan.name}</h3>
                <p className="text-gray-500 text-xs leading-relaxed px-3">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center">
                  <span className="text-3xl font-black text-gray-900">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  {plan.price > 0 && (
                    <span className="ml-2 text-gray-500 text-xs font-medium">
                      /{formatInterval(plan.interval)}
                    </span>
                  )}
                </div>
                {plan.limit && (
                  <p className="text-xs text-gray-600 mt-2 font-medium px-2">
                    {plan.limit === 1000 ? "Unlimited" : plan.limit} questions / {formatInterval(plan.interval)}
                  </p>
                )}
                {plan.imageLimit != null && (
                  <p className="text-xs text-gray-600 mt-1 font-medium px-2">
                    {plan.imageLimit === 0 ? "No images" : `${plan.imageLimit} images`} / {formatInterval(plan.interval)}
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="flex-1 space-y-3 mb-6 px-4">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-2 group">
                    <div className="flex-shrink-0 mt-1 p-1.5 rounded-full bg-gray-100 group-hover:bg-blue-50 text-blue-600 transition-colors duration-200 shadow-sm flex items-center justify-center">
                      {getIconForFeature(feature)}
                    </div>
                    <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors duration-200 leading-relaxed flex-1">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Action Button - Fixed at bottom */}
              <div className="mt-auto px-4 pb-6">
                {plan.id === "free" ? (
                  <Button
                    onClick={() => handlePlanSelect(plan)}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 border border-gray-300 font-semibold py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg text-sm"
                    disabled={isLoading}
                  >
                    Current Plan
                  </Button>
                ) : !plan.stripePriceId ? (
                  <Button className="w-full bg-gray-300 text-gray-500 cursor-not-allowed font-semibold py-2.5 rounded-xl text-sm" disabled>
                    Coming Soon
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlanSelect(plan)}
                    className={`w-full font-bold py-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 text-sm ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl text-white"
                        : "bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl text-white"
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>




        {/* Enhanced Add-on Plans */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Add-on Features
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Need more? Get additional features to enhance your learning experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {addOnPlans.map((plan, index) => (
              <div
                key={plan.id}
                className="relative rounded-3xl shadow-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-8 flex flex-col h-full transform hover:scale-105 transition-all duration-300 hover:shadow-2xl"
                style={{
                  animationDelay: `${index * 200}ms`,
                  animation: 'fadeInUp 0.8s ease-out forwards'
                }}
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                    {plan.id === "extra-images" ? (
                      <Image className="w-8 h-8 text-blue-600" />
                    ) : (
                      <Rocket className="w-8 h-8 text-indigo-600" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{plan.description}</p>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-black text-gray-900">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="ml-2 text-gray-500 text-sm font-medium">
                      /{formatInterval(plan.interval)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handlePlanSelect(plan)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  disabled={isLoading || !plan.stripePriceId}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Get ${plan.name}`
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced FAQ Section */}
        <div className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-md rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto border border-gray-200/50">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about our AI Tutor plans
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              {
                q: "Can I change my plan anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.",
                icon: <Zap className="w-5 h-5 text-blue-600" />
              },
              {
                q: "What happens if I reach my question limit?",
                a: "You'll be notified when you're close to your limit. You can upgrade your plan to continue learning.",
                icon: <Target className="w-5 h-5 text-green-600" />
              },
              {
                q: "Is there a free trial?",
                a: "Yes! Every new user gets 10 free questions per month to experience our AI tutor before subscribing.",
                icon: <Star className="w-5 h-5 text-yellow-600" />
              },
              {
                q: "Can I cancel my subscription?",
                a: "Absolutely. You can cancel anytime and continue using your plan until the end of your billing period.",
                icon: <Shield className="w-5 h-5 text-purple-600" />
              },
              {
                q: "What's included in image generation?",
                a: "Diagrams, graphs, mathematical visualizations, and educational illustrations. Available on Standard plan and above.",
                icon: <Image className="w-5 h-5 text-pink-600" />
              },
              {
                q: "Do you support voice responses?",
                a: "Yes! All plans include voice responses using ElevenLabs TTS technology.",
                icon: <Volume2 className="w-5 h-5 text-indigo-600" />
              },
            ].map((item, idx) => (
              <div key={idx} className="group">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex-shrink-0 mt-1 p-2 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-200">
                    {item.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-200">{item.q}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed ml-14">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
