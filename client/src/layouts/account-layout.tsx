import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  LogOut,
  MapPin,
  MessageSquareText,
  ReceiptText,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logoutMutationFn } from "@/lib/api";
import { toast } from "sonner";
import { PUBLIC_ROUTES } from "@/routes/route";

const accountNavItems = [
  {
    label: "Order history",
    to: "/orders",
    icon: ReceiptText,
  },
  // {
  //   label: "Account settings",
  //   to: "/account/settings",
  //   icon: Settings,
  // },
  {
    label: "Ratings & reviews",
    to: "/account/reviews",
    icon: MessageSquareText,
  },
  {
    label: "Addresses",
    to: "/account/addresses",
    icon: MapPin,
  },
];

const AccountLayout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logoutMutationFn,
    onSuccess: () => {
      queryClient.setQueryData(["current-user"], null);
      toast.success("Logged out successfully");
      navigate(PUBLIC_ROUTES.HOME);
    },
  });

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-8 py-6 lg:grid-cols-[260px_1fr]">
      <aside className="border-border lg:border-r lg:pr-5">
        <div className="flex flex-col gap-2 lg:sticky lg:top-24">
          <Button
            type="button"
            variant="ghost"
            className="w-fit px-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>

          <Separator className="h-px bg-border" />

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {accountNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/orders"}
                  className={({ isActive }) =>
                    cn(
                      "flex min-w-fit items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted lg:min-w-0",
                      isActive && "bg-foreground text-background hover:bg-foreground"
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <Separator className="hidden h-px bg-border lg:block" />

          <div className="hidden flex-col gap-2 lg:flex">
            <Button
              variant="ghost"
              className="justify-start px-3 text-muted-foreground"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut data-icon="inline-start" />
              {logoutMutation.isPending ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
};

export default AccountLayout;
