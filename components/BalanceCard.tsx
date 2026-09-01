import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceCacheStore } from "@/store/useFinanceCacheStore";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { useShallow } from "zustand/react/shallow";
import type { CachedAccount } from "../store/useFinanceCacheStore";
import CardBackdrop from "./ui/CardBackdrop";
import PremiumIcon from "./ui/PremiumIcon";

const CREDIT_SUBTYPE_LABELS: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  personal_loan: "Libre inversión",
  mortgage: "Hipotecario",
  credit_line: "Línea de crédito",
};

const CARD_HEIGHT = 240;

interface StatItem {
  label: string;
  value: string;
  labelClass?: string;
}

interface BalanceCardProps {
  title?: string;
  mainValue?: string;
  stats?: StatItem[];
  loading?: boolean;
  selectedAccountId?: string | null;
  onAccountChange?: (accountId: string | null) => void;
}

const BalanceCard = (props: BalanceCardProps) => {
  if (props.stats) {
    return <BalanceCardContent {...props} />;
  }
  return <BalanceCardCarousel {...props} />;
};

const BalanceCardCarousel = ({ onAccountChange }: BalanceCardProps) => {
  const userId = useAuthStore((s) => s.userId);
  const {
    accounts,
    loading: accountsLoading,
    summary: accountsSummary,
  } = useFinanceCacheStore(
    useShallow((s) => ({
      accounts: s.accounts,
      loading: s.loading,
      summary: s.summary,
    })),
  );

  const { summary, loading } = useFinanceData(userId || "");
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const router = useRouter();

  const slides = useMemo(
    () => ["total", ...accounts.map((account) => account.id)],
    [accounts],
  );
  
  const formatCOP = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);

  const totalCard = (
    <BalanceCardContent
      title="Balance total"
      mainValue={formatCOP(accountsSummary.totalBalance)}
      stats={[
        {
          label: "Ingresos",
          value: `+${formatCOP(summary.income)}`,
          labelClass: "text-green-700",
        },
        {
          label: "Gastos",
          value: `-${formatCOP(summary.expense)}`,
          labelClass: "text-red-700",
        },
      ]}
    />
  );

  if (loading || accountsLoading) {
    return <LoadingCard />;
  }

  if (accounts.length === 0) {
    return (
      <Pressable
        onLongPress={() => router.push("/accounts")}
        delayLongPress={400}
      >
        {totalCard}
      </Pressable>
    );
  }

  return (
    <View
      style={{ marginBottom: 24 }}
      onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
    >
      {carouselWidth > 0 && (
        <Carousel
          loop={false}
          width={carouselWidth}
          height={CARD_HEIGHT}
          data={slides}
          onSnapToItem={(index) => {
            setActiveIndex(index); // Actualizas tu estado local

            // Le pasas el ID al Padre inmediatamente
            if (onAccountChange) {
              const accountId = index === 0 ? null : (slides[index] ?? null);
              onAccountChange(accountId);
            }
          }}
          renderItem={({ item, index }) =>
            index === 0 ? (
              <Pressable
                onLongPress={() => router.push("/accounts")}
                delayLongPress={400}
              >
                {totalCard}
              </Pressable>
            ) : (
              <Pressable
                onLongPress={() =>
                  router.push({
                    pathname: "/accounts/[id]",
                    params: { id: accounts[index - 1].id },
                  })
                }
                delayLongPress={400}
              >
                <AccountCard account={accounts[index - 1]} />
              </Pressable>
            )
          }
        />
      )}
    </View>
  );
};

const AccountCard = ({ account }: { account: CachedAccount }) => {
  const isCredit = account.type === "credit";
  const subtypeLabel =
    CREDIT_SUBTYPE_LABELS[account.creditSubtype ?? ""] ?? "Crédito";
  const balance = account.balance ?? 0;
  const availableCredit = (account.creditLimit ?? 0) - balance;

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: account.currency ?? "COP",
    }).format(value);

  const typeLabel = isCredit
    ? subtypeLabel
    : account.type === "cash"
      ? "Efectivo"
      : account.type === "savings"
        ? "Ahorro"
        : account.type === "checking"
          ? "Corriente"
          : "Cuenta";

  const secondLabel = isCredit ? "Disponible" : "Institución";
  const secondValue = isCredit
    ? formatMoney(availableCredit)
    : (account.institution ?? account.currency ?? "COP");
  const secondClass = isCredit
    ? availableCredit < 0
      ? "text-expense dark:text-expense-dark"
      : "text-ink dark:text-ink-dark"
    : "text-ink dark:text-ink-dark";

  return (
    <View className="h-60 mx-4 rounded-3xl overflow-hidden border border-black/10 dark:border-white/15">
      <CardBackdrop
        glowColor="#1d7df0"
        glowOpacity={0.12}
        glowSize={220}
        glowTop={-90}
        glowRight={-70}
      />
      <View className="flex-1 p-5 justify-between">
        <View className="flex-row items-center justify-center mb-4">
          <PremiumIcon
            token={account.iconImage}
            size={26}
            radius={7}
            fallback="💳"
            textColor="#f6f8ff"
          />
          <Text className="text-muted dark:text-muted-dark text-sm font-semibold ml-2">
            {account.name}
          </Text>
        </View>
        <Text className="text-3xl font-bold mb-4 text-ink dark:text-ink-dark text-center">
          {formatMoney(balance)}
        </Text>
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-muted dark:text-muted-dark">
              Tipo
            </Text>
            <Text className="font-semibold text-ink dark:text-ink-dark text-base my-1">
              {typeLabel}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-muted dark:text-muted-dark">
              {secondLabel}
            </Text>
            <Text className={`font-semibold text-base my-1 ${secondClass}`}>
              {secondValue}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const BalanceCardContent = ({
  title,
  mainValue,
  stats,
  loading,
}: BalanceCardProps) => {
  if (loading) {
    return <LoadingCard />;
  }

  return (
    <View className="h-60 rounded-3xl overflow-hidden border border-black/10 dark:border-white/15">
      <CardBackdrop
        glowColor="#1d7df0"
        glowOpacity={0.14}
        glowSize={230}
        glowTop={-100}
        glowRight={-80}
      />
      <View className="flex-1 p-5 justify-between">
        <Text className="text-muted dark:text-muted-dark text-xl font-semibold text-center">
          {title}
        </Text>
        <Text className="text-ink dark:text-ink-dark text-4xl font-bold tracking-tight text-center">
          {mainValue}
        </Text>
        <View className="flex-row justify-between">
          {stats?.map((stat) => (
            <View key={stat.label}>
              <Text
                className={`text-base font-bold ${stat.labelClass ?? "text-muted dark:text-muted-dark"}`}
              >
                {stat.label}
              </Text>
              <Text className="font-semibold text-ink dark:text-ink-dark text-base my-1">
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const LoadingCard = () => (
  <View className="h-60 rounded-3xl overflow-hidden border border-black/10 dark:border-white/15 items-center justify-center">
    <CardBackdrop glowColor="#1d7df0" glowOpacity={0.12} glowSize={200} />
    <ActivityIndicator color="#58a5ff" />
  </View>
);

export default BalanceCard;
