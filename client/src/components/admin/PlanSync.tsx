import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { syncPlans, type StripePlan } from '@/utils/stripeClient';
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react';

const PlanSync: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncedPlans, setSyncedPlans] = useState<StripePlan[]>([]);
  const { toast } = useToast();

  const handleSyncPlans = async () => {
    setIsLoading(true);
    try {
      const plans = await syncPlans();
      setSyncedPlans(plans);
      toast({
        title: "Plans Synced Successfully!",
        description: `${plans.length} plans have been synced with Stripe.`,
      });
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync plans with Stripe.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sync Plans with Stripe
        </CardTitle>
        <CardDescription>
          This will create Stripe products and prices for all your subscription plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleSyncPlans} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing Plans...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Plans with Stripe
            </>
          )}
        </Button>

        {syncedPlans.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Synced Plans:</h4>
            {syncedPlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-sm text-gray-500 ml-2">${plan.price}/{plan.interval}</span>
                </div>
                {plan.stripePriceId ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-xs">Synced</span>
                  </div>
                ) : (
                  <span className="text-xs text-red-500">Failed</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanSync;
