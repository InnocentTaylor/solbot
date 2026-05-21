import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetConfig, useUpdateConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

// Validate Solana address format loosely
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const configSchema = z.object({
  walletAddress: z.string()
    .min(1, "Wallet address is required")
    .regex(solanaAddressRegex, "Must be a valid Solana address (base58, 32-44 characters)"),
  buyMarketCapUsd: z.coerce.number().min(1000, "Minimum $1,000"),
  sellMarketCapUsd: z.coerce.number().min(2000, "Minimum $2,000"),
  maxPositions: z.coerce.number().min(1, "At least 1 position").max(10, "Max 10 positions"),
  slippageBps: z.coerce.number().min(1, "Min 1 BPS").max(1000, "Max 1000 BPS (10%)"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { data: config, isLoading } = useGetConfig();
  
  const updateConfig = useUpdateConfig({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Configuration Saved",
          description: "Bot settings have been updated successfully.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.message || "Failed to update configuration.",
          variant: "destructive",
        });
      }
    }
  });

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      walletAddress: "",
      buyMarketCapUsd: 10000,
      sellMarketCapUsd: 35000,
      maxPositions: 3,
      slippageBps: 100,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        walletAddress: config.walletAddress || "",
        buyMarketCapUsd: config.buyMarketCapUsd,
        sellMarketCapUsd: config.sellMarketCapUsd,
        maxPositions: config.maxPositions,
        slippageBps: config.slippageBps,
      });
    }
  }, [config, form]);

  const onSubmit = (data: ConfigFormValues) => {
    updateConfig.mutate({ data });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure bot operational parameters and risk limits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trading Configuration</CardTitle>
          <CardDescription>Adjust the entry, exit, and risk thresholds.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="walletAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solana Wallet Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your public key..." className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>The wallet the bot will use to sign and send transactions.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="buyMarketCapUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Market Cap (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>Target market cap to snipe.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sellMarketCapUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exit Market Cap (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>Target market cap to take profit.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxPositions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Concurrent Positions</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>Maximum number of tokens to hold at once.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slippageBps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slippage (BPS)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>Max slippage. 100 BPS = 1%.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateConfig.isPending || isLoading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
