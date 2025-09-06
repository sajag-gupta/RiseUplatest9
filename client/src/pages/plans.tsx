import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Star, Crown, Zap, Shield, Headphones, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for getting started",
    icon: Headphones,
    features: [
      "Listen to music",
      "Create playlists",
      "Follow artists",
      "Basic recommendations",
      "Limited skips per hour"
    ],
    limitations: [
      "Ads between songs",
      "Lower audio quality",
      "No offline downloads",
      "Limited customer support"
    ],
    popular: false,
    buttonText: "Current Plan"
  },
  {
    id: "premium",
    name: "Premium",
    price: 99,
    period: "month",
    description: "The complete music experience",
    icon: Crown,
    features: [
      "Ad-free listening",
      "High-quality audio (320kbps)",
      "Offline downloads",
      "Unlimited skips",
      "Priority customer support",
      "Exclusive content access",
      "Early access to new releases",
      "Advanced analytics (for artists)"
    ],
    popular: true,
    buttonText: "Upgrade to Premium"
  },
  {
    id: "artist",
    name: "Artist Pro",
    price: 299,
    period: "month",
    description: "Everything for creators",
    icon: Star,
    features: [
      "All Premium features",
      "Upload unlimited songs",
      "Advanced analytics dashboard",
      "Direct fan communication",
      "Merchandise store",
      "Event management tools",
      "Custom artist profile",
      "Revenue insights",
      "Fan engagement tools",
      "Priority distribution"
    ],
    popular: false,
    buttonText: "Start Creating"
  }
];

export default function Plans() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/users/me/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error("Failed to upgrade plan");
      }

      return response.json();
    },
    onSuccess: (data, planId) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Plan upgraded successfully!",
        description: `Welcome to ${PLANS.find(p => p.id === planId)?.name}!`,
      });
      setLocation("/home");
    },
    onError: (error) => {
      toast({
        title: "Upgrade failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string) => {
    if (!user) {
      setLocation("/auth/login");
      return;
    }

    if (planId === "free") {
      return; // Already on free plan
    }

    upgradeMutation.mutate(planId);
  };

  const currentPlan = user?.plan?.type?.toLowerCase() || "free";

  return (
    <div className="min-h-screen pt-16 pb-16">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of Rise Up Creators with our premium plans
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            const isPopular = plan.popular;

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isPopular
                    ? "border-primary shadow-lg scale-105"
                    : isCurrentPlan
                    ? "border-success"
                    : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-success text-white px-4 py-1">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      isPopular ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        isPopular ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                  </div>

                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>

                  <div className="text-3xl font-bold mb-2">
                    {plan.price === 0 ? (
                      "Free"
                    ) : (
                      <>
                        ₹{plan.price}
                        <span className="text-lg font-normal text-muted-foreground">
                          /{plan.period}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wide">
                      What's Included
                    </h4>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limitations (for free plan) */}
                  {plan.limitations && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        Limitations
                      </h4>
                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {limitation}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="pt-6">
                    <Button
                      className={`w-full ${
                        isCurrentPlan
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : isPopular
                          ? "bg-primary hover:bg-primary/90"
                          : ""
                      }`}
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isCurrentPlan || upgradeMutation.isPending}
                    >
                      {upgradeMutation.isPending
                        ? "Processing..."
                        : isCurrentPlan
                        ? "Current Plan"
                        : plan.buttonText
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time.
                  Changes take effect immediately for upgrades, or at the end of your billing cycle for downgrades.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards, debit cards, UPI, net banking,
                  and digital wallets through our secure Razorpay integration.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We offer a 7-day free trial for Premium plans. No credit card required to start.
                  Cancel anytime during the trial period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel my subscription?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Absolutely! You can cancel your subscription at any time from your account settings.
                  You'll continue to have access until the end of your billing period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of artists and fans who are already creating and discovering amazing music on Rise Up Creators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground px-8 py-4 rounded-2xl font-semibold text-lg"
                onClick={() => handleUpgrade("premium")}
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-4 rounded-2xl font-semibold text-lg"
                onClick={() => setLocation("/")}
              >
                <Headphones className="w-5 h-5 mr-2" />
                Explore Music
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
