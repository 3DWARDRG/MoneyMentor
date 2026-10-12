// components/ImportVerificationModal.tsx
//
// Pantalla de VERIFICACIÓN de movimientos extraídos por OCR local.
// El usuario revisa, edita y confirma antes de que nada se guarde.
// Aquí nunca se muestra texto crudo del extracto sin redactar.

import { Dropdown } from "@/components/Dropdown";
import {
  useImportStore,
  formatDateText,
  parseDateText,
  type ImportCandidate,
  type ImportCandidateType,
} from "@/store/useImportStore";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { parseMoney } from "@/services/ai/statementParser";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PremiumIcon from "@/components/ui/PremiumIcon";

interface ImportVerificationModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onImported: (result: { count: number; total: number }) => void;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);

// Campos obligatorios de un movimiento antes de guardar. Devuelve los campos
// faltantes; si el movimiento está completo la lista queda vacía.
const getMissingFields = (
  c: ImportCandidate,
  amountText: string,
): string[] => {
  const missing: string[] = [];
  if (parseDateText(c.dateText) === null) missing.push("date");
  const parsed = parseMoney(amountText);
  if (parsed === null || parsed === 0) missing.push("amount");
  if (c.description.trim() === "") missing.push("description");
  if (c.type === "transfer") {
    if (!c.transferTarget) missing.push("transferTarget");
    else if (c.transferTarget === "own" && !c.destinationAccountId)
      missing.push("destination");
    else if (c.transferTarget === "person" && !c.personName.trim())
      missing.push("person");
  } else if (!c.categoryId) {
    missing.push("category");
  }
  return missing;
};

const INVALID_BORDER =
  "border-expense/60 dark:border-expense-dark/60";
const VALID_BORDER = "border-black/10 dark:border-white/10";

export default function ImportVerificationModal({
  visible,
  userId,
  onClose,
  onImported,
}: ImportVerificationModalProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const {
    candidates,
    accountId,
    setAccountId,
    toggleCandidate,
    updateCandidate,
    addFromLine,
    addManual,
    confirm,
    cancel,
    saving,
    error,
    clearError,
    unparsedCount,
    pages,
    period,
    setPeriod,
  } = useImportStore();

  const { categories } = useCategories(userId);
  const { accounts } = useAccounts(userId);
  const financeAccounts = useMemo(
    () => accounts.filter((a) => a.isActive !== false),
    [accounts]
  );

  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [showRaw, setShowRaw] = useState(false);
  const [categoryPickerFor, setCategoryPickerFor] = useState<
    | { kind: "candidate"; id: string }
    | { kind: "group"; key: string }
    | null
  >(null);
  // Agrupación por comercio: panel "aplicar a todos" expandido por grupo.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  // Borradores de descripción por grupo de comercio.
  const [groupDrafts, setGroupDrafts] = useState<
    Record<string, { description: string }>
  >({});
  // Paginación: solo se renderiza la página/imagen actual (rendimiento).
  const [currentPage, setCurrentPage] = useState(1);
  // Edición del periodo del extracto (rango de fechas).
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [periodFromDraft, setPeriodFromDraft] = useState("");
  const [periodToDraft, setPeriodToDraft] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);

  // Al abrir el modal (nueva sesión) se reinicia el panel de texto.
  useEffect(() => {
    if (visible) {
      setShowRaw(false);
      setAmountDrafts({});
      setCurrentPage(1);
      setEditingPeriod(false);
      setPeriodError(null);
      setExpandedGroups({});
      setGroupDrafts({});
    }
  }, [visible, userId]);

  const selectedCount = useMemo(() => candidates.filter((c) => c.selected).length, [candidates]);
  const selectedTotal = useMemo(
    () =>
      candidates
        .filter((c) => c.selected)
        .reduce((acc, c) => acc + Math.abs(c.amount ?? 0), 0),
    [candidates],
  );

  // Movimientos seleccionados con algún campo obligatorio vacío o inválido.
  // Su botón "Confirmar y guardar" queda deshabilitado y se marcan en rojo.
  const incompleteCount = useMemo(
    () =>
      candidates.filter(
        (c) =>
          c.selected &&
          getMissingFields(c, amountDrafts[c.id] ?? c.amountText).length > 0,
      ).length,
    [candidates, amountDrafts],
  );

  // Candidatos agrupados por página/imagen de origen, en orden de página.
  const groupedCandidates = useMemo(() => {
    const groups = new Map<number, (typeof candidates)[number][]>();
    for (const c of candidates) {
      const page = c.page ?? 1;
      const list = groups.get(page) ?? [];
      list.push(c);
      groups.set(page, list);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [candidates]);

  // Páginas con contenido (movimientos o líneas de texto), para la paginación.
  const pageNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const c of candidates) set.add(c.page ?? 1);
    for (const p of pages) set.add(p.page);
    return [...set].sort((a, b) => a - b);
  }, [candidates, pages]);

  // Página actual (si el contenido cambió, se mantiene dentro del rango).
  const safeCurrentPage = useMemo(() => {
    if (pageNumbers.includes(currentPage)) return currentPage;
    return pageNumbers[0] ?? 1;
  }, [currentPage, pageNumbers]);

  // Movimientos y líneas de la página/imagen actual.
  const currentPageCandidates = useMemo(
    () => groupedCandidates.find(([p]) => p === safeCurrentPage)?.[1] ?? [],
    [groupedCandidates, safeCurrentPage],
  );
  const currentPageLines = useMemo(
    () => pages.find((p) => p.page === safeCurrentPage)?.lines ?? [],
    [pages, safeCurrentPage],
  );

  // Movimientos de la página actual agrupados por comercio. La clave de
  // comercio se calcula UNA vez al crear el candidato (`merchantKey`), así que
  // editar la descripción NO mueve el movimiento de grupo.
  const pageGroups = useMemo(() => {
    const map = new Map<string, (typeof candidates)[number][]>();
    for (const c of currentPageCandidates) {
      const key = c.merchantKey;
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [currentPageCandidates]);

  // Al cambiar de página se vuelve arriba de la lista.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [safeCurrentPage]);

  // Movimientos cuya fecha queda fuera del periodo del extracto.
  const outOfRangeCount = useMemo(() => {
    if (!period) return 0;
    return candidates.filter(
      (c) => c.date !== null && (c.date < period.from || c.date > period.to),
    ).length;
  }, [candidates, period]);

  const startEditingPeriod = () => {
    setPeriodFromDraft(period ? formatDateText(period.from) : "");
    setPeriodToDraft(period ? formatDateText(period.to) : "");
    setPeriodError(null);
    setEditingPeriod(true);
  };

  const applyPeriod = async () => {
    const from = parseDateText(periodFromDraft);
    const to = parseDateText(periodToDraft);
    if (from === null || to === null) {
      setPeriodError("Formato de fecha inválido (dd/mm/aaaa).");
      return;
    }
    if (to < from) {
      setPeriodError("La fecha de fin debe ser posterior al inicio.");
      return;
    }
    await setPeriod(from, to);
    setEditingPeriod(false);
    setPeriodError(null);
  };

  const handleConfirm = async () => {
    if (!userId) return;
    if (incompleteCount > 0) {
      Alert.alert(
        "Movimientos incompletos",
        `Hay ${incompleteCount} movimiento(s) con campos en rojo. Complétalos o deselecciona antes de guardar.`,
      );
      return;
    }
    const result = await confirm(userId);
    if (result) onImported(result);
  };

  const handleClose = () => {
    if (saving) return;
    cancel();
    onClose();
  };

  // Líneas del texto ya redactado de una página/imagen, para agregar a mano.
  const renderPageLines = (page: { page: number; lines: string[] }) => (
    <View key={page.page}>
      {page.lines.map((line, index) => (
        <Pressable
          key={`${page.page}-${index}-${line}`}
          onPress={() => addFromLine(line)}
          className="mb-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2.5"
        >
          <Text className="text-[13px] leading-snug text-ink dark:text-ink-dark">
            {line}
          </Text>
          <Text className="mt-0.5 text-[10px] font-medium text-accent dark:text-accent-dark">
            Tocar para agregar +
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // Re-signa el valor según el tipo: ingreso positivo, gasto y transferencia
  // negativos. Conserva la magnitud que ya tuviera el monto.
  const signedAmountText = (
    amountText: string,
    type: "income" | "expense" | "transfer",
  ) => {
    const parsed = parseMoney(amountText);
    if (parsed === null) return amountText;
    const abs = Math.abs(parsed);
    return type === "income" ? String(abs) : String(-abs);
  };

  // Cambia el tipo del movimiento y limpia los campos que no aplican:
  // - Al pasar a transferencia se quita la categoría.
  // - Al salir de transferencia se limpian los campos de destino.
  // El valor se ajusta automáticamente al signo del nuevo tipo.
  const setCandidateType = (
    id: string,
    type: "income" | "expense" | "transfer",
  ) => {
    const current =
      amountDrafts[id] ??
      candidates.find((c) => c.id === id)?.amountText ??
      "";
    const nextAmountText = signedAmountText(current, type);
    if (nextAmountText !== current) {
      setAmountDrafts((d) => ({ ...d, [id]: nextAmountText }));
      updateCandidate(id, { amountText: nextAmountText });
    }
    if (type === "transfer") {
      updateCandidate(id, { type, categoryId: null });
    } else {
      updateCandidate(id, {
        type,
        transferTarget: null,
        destinationAccountId: null,
        personName: "",
      });
    }
  };

  // ─── Acciones de GRUPO (aplicar a todos los movimientos del comercio) ───
  const groupMembers = (key: string) =>
    pageGroups.find(([k]) => k === key)?.[1] ?? [];

  const toggleGroup = (key: string) =>
    setExpandedGroups((s) => ({ ...s, [key]: !s[key] }));

  const setGroupDraft = (key: string, description: string) =>
    setGroupDrafts((s) => ({ ...s, [key]: { description } }));

  const applyGroupType = (key: string, type: ImportCandidateType) => {
    for (const m of groupMembers(key)) setCandidateType(m.id, type);
  };

  const applyGroupDescription = (key: string) => {
    const description = (groupDrafts[key]?.description ?? "").trim();
    if (!description) return;
    for (const m of groupMembers(key)) {
      updateCandidate(m.id, { description });
    }
  };

  const applyGroupCategory = (key: string, categoryId: string | null) => {
    for (const m of groupMembers(key)) {
      updateCandidate(m.id, { categoryId });
    }
  };

  const applyGroupTransferTarget = (
    key: string,
    target: "own" | "person",
  ) => {
    for (const m of groupMembers(key)) {
      updateCandidate(m.id, {
        transferTarget: target,
        destinationAccountId:
          target === "person" ? null : m.destinationAccountId,
      });
    }
  };

  const applyGroupDestinationAccount = (key: string, accountId: string) => {
    for (const m of groupMembers(key)) {
      updateCandidate(m.id, { destinationAccountId: accountId });
    }
  };

  const applyGroupPersonName = (key: string, personName: string) => {
    for (const m of groupMembers(key)) {
      updateCandidate(m.id, { personName });
    }
  };

  // Tarjeta de comercio: asigna descripción/categoría/tipo UNA vez y se aplica
  // a todos los movimientos del grupo.
  const renderGroupCard = (
    key: string,
    members: (typeof candidates)[number][],
  ) => {
    const expanded = !!expandedGroups[key];
    const total = members.reduce((acc, c) => acc + Math.abs(c.amount ?? 0), 0);
    const firstDesc = members[0]?.description || key;
    const draft = groupDrafts[key]?.description ?? firstDesc;
    const groupIsTransfer = members.every((m) => m.type === "transfer");
    const destinationOptions = financeAccounts.filter(
      (a) => a.id !== accountId,
    );

    const typeStyles: Record<
      ImportCandidateType,
      { active: string; label: string }
    > = {
      expense: {
        active: "bg-expense",
        label: "Gasto",
      },
      income: {
        active: "bg-income",
        label: "Ingreso",
      },
      transfer: {
        active: "bg-accent dark:bg-accent-dark",
        label: "Transf.",
      },
    };

    return (
      <View
        key={`group-${key}`}
        className="mb-3 rounded-2xl border border-accent/30 bg-accent/5 p-3"
      >
        <Pressable
          onPress={() => toggleGroup(key)}
          className="flex-row items-center justify-between"
        >
          <View className="flex-1 pr-2">
            <Text className="text-sm font-bold text-ink dark:text-ink-dark capitalize">
              {key}
            </Text>
            <Text className="text-[11px] text-muted dark:text-muted-dark">
              {members.length} movimientos · {formatCOP(total)} COP
            </Text>
          </View>
          <Text className="text-xs font-semibold text-accent dark:text-accent-dark">
            {expanded ? "Cerrar ▲" : "Aplicar a todos ▼"}
          </Text>
        </Pressable>

        {expanded ? (
          <View className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark p-3">
            <Text className="mb-1.5 text-[11px] font-medium text-muted dark:text-muted-dark">
              Asigna una vez y se aplica a los {members.length} movimientos
            </Text>

            {/* Tipo */}
            <View className="mb-2 flex-row overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
              {(Object.keys(typeStyles) as ImportCandidateType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => applyGroupType(key, t)}
                  className={`flex-1 items-center px-3 py-1.5 ${
                    members.every((m) => m.type === t)
                      ? typeStyles[t].active
                      : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      members.every((m) => m.type === t)
                        ? "text-white"
                        : "text-muted dark:text-muted-dark"
                    }`}
                  >
                    {typeStyles[t].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {groupIsTransfer ? (
              <View>
                <Text className="mb-1.5 text-xs font-medium text-muted dark:text-muted-dark">
                  Destino
                </Text>
                <View className="flex-row gap-2 mb-2">
                  {(
                    [
                      { value: "own", label: "Mis cuentas" },
                      { value: "person", label: "Otra persona" },
                    ] as const
                  ).map((target) => {
                    const active = members[0]?.transferTarget === target.value;
                    return (
                      <Pressable
                        key={target.value}
                        onPress={() =>
                          applyGroupTransferTarget(key, target.value)
                        }
                        className={`flex-1 items-center rounded-xl border px-3 py-2 ${
                          active
                            ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                            : "border-black/10 dark:border-white/10"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            active
                              ? "text-accent dark:text-accent-dark"
                              : "text-muted dark:text-muted-dark"
                          }`}
                        >
                          {target.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!members[0]?.transferTarget ? (
                  <Text className="mb-2 text-[11px] text-expense dark:text-expense-dark">
                    Selecciona un destino
                  </Text>
                ) : null}

                {members[0]?.transferTarget === "own" ? (
                  destinationOptions.length === 0 ? (
                    <Text className="text-xs text-muted dark:text-muted-dark">
                      Crea otra cuenta para poder transferir entre tus cuentas.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="flex-row"
                    >
                      {destinationOptions.map((acc) => {
                        const active =
                          members[0]?.destinationAccountId === acc.id;
                        return (
                          <Pressable
                            key={acc.id}
                            onPress={() =>
                              applyGroupDestinationAccount(key, acc.id)
                            }
                            className={`mx-1 rounded-2xl border px-3 py-2 ${
                              active
                                ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                                : "border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark"
                            }`}
                          >
                            <Text
                              numberOfLines={1}
                              className={`text-xs font-semibold ${
                                active
                                  ? "text-accent dark:text-accent-dark"
                                  : "text-ink dark:text-ink-dark"
                              }`}
                              style={{ maxWidth: 160 }}
                            >
                              {acc.name}
                            </Text>
                            <Text
                              className={`text-[10px] mt-0.5 ${
                                active
                                  ? "text-accent/80 dark:text-accent-dark/80"
                                  : "text-muted dark:text-muted-dark"
                              }`}
                            >
                              {acc.currency}{" "}
                              {Number(acc.balance ?? 0).toLocaleString("es-CO")}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )
                ) : (
                  <TextInput
                    className={`rounded-xl border px-3 py-2 text-sm text-ink dark:text-ink-dark bg-deepSoft dark:bg-deepSoft-dark ${
                      members[0]?.transferTarget === "person" &&
                      !members[0]?.personName.trim()
                        ? INVALID_BORDER
                        : VALID_BORDER
                    }`}
                    placeholder="Nombre de la persona"
                    placeholderTextColor="#9ca3af"
                    value={members[0]?.personName ?? ""}
                    onChangeText={(personName) =>
                      applyGroupPersonName(key, personName)
                    }
                  />
                )}
              </View>
            ) : (
              <>
                {/* Descripción */}
                <TextInput
                  className={`rounded-xl border px-3 py-2 text-sm text-ink dark:text-ink-dark bg-deepSoft dark:bg-deepSoft-dark ${
                    draft.trim() === "" ? INVALID_BORDER : VALID_BORDER
                  }`}
                  placeholder="Descripción para todos"
                  placeholderTextColor="#9ca3af"
                  value={draft}
                  onChangeText={(text) => setGroupDraft(key, text)}
                  multiline
                />
                {draft.trim() === "" ? (
                  <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
                    Falta la descripción
                  </Text>
                ) : null}

                {/* Categoría + aplicar descripción */}
                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    onPress={() => setCategoryPickerFor({ kind: "group", key })}
                    className={`flex-1 flex-row items-center justify-between rounded-xl border bg-deepSoft dark:bg-deepSoft-dark px-3 py-2.5 ${
                      !members[0]?.categoryId ? INVALID_BORDER : VALID_BORDER
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-sm ${
                        members[0]?.categoryId
                          ? "text-ink dark:text-ink-dark"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {categories.find(
                        (cat) => cat.id === members[0]?.categoryId,
                      )?.name ?? "Categoría"}
                    </Text>
                    <Text className="ml-1 text-xs text-muted dark:text-muted-dark">
                      ▾
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => applyGroupDescription(key)}
                    className="items-center justify-center rounded-xl bg-accent dark:bg-accent-dark px-4"
                  >
                    <Text className="text-sm font-semibold text-white">
                      Aplicar
                    </Text>
                  </Pressable>
                </View>
                {!members[0]?.categoryId ? (
                  <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
                    Selecciona una categoría
                  </Text>
                ) : null}
              </>
            )}

            {/* Tipo que se aprenderá en el diccionario */}
            <Text className="mt-2 text-[10px] text-muted dark:text-muted-dark">
              🧠 Se memorizará en tu diccionario para próximas importaciones.
            </Text>
          </View>
        ) : null}

        {members.map(renderRow)}
      </View>
    );
  };

  // Lista de la página actual: grupos por comercio primero, luego el resto.
  const renderGroupedCandidates = () => {
    const grouped = pageGroups.filter(([, m]) => m.length > 1);
    const groupedKeys = new Set(grouped.map(([k]) => k));
    const singles = currentPageCandidates.filter((c) => {
      return !(c.merchantKey && groupedKeys.has(c.merchantKey));
    });
    return (
      <>
        {grouped.map(([key, members]) => renderGroupCard(key, members))}
        {singles.map(renderRow)}
      </>
    );
  };

  const renderRow = (c: (typeof candidates)[number]) => {
    const amountText = amountDrafts[c.id] ?? c.amountText;
    const parsed = parseMoney(amountText) ?? c.amount ?? 0;
    const isTransfer = c.type === "transfer";
    // Cuentas propias disponibles como destino (la cuenta del extracto se
    // excluye: no se puede transferir a la misma cuenta).
    const destinationOptions = financeAccounts.filter(
      (a) => a.id !== accountId,
    );
    // Campos obligatorios faltantes (solo importan los seleccionados).
    const missing = c.selected ? getMissingFields(c, amountText) : [];
    const missingSet = new Set(missing);

    return (
      <View
        key={c.id}
        className="mb-3 rounded-2xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark p-3"
      >
        {/* Cabecera de fila: selección + tipo */}
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={() => toggleCandidate(c.id)}
            className="flex-row items-center"
          >
            <View
              className={`mr-2 h-6 w-6 items-center justify-center rounded-md border ${
                c.selected
                  ? "border-accent dark:border-accent-dark bg-accent dark:bg-accent-dark"
                  : "border-black/20 dark:border-white/20"
              }`}
            >
              {c.selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}
            </View>
            <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
              Movimiento
            </Text>
          </Pressable>

          <View className="flex-row overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
            <Pressable
              onPress={() => setCandidateType(c.id, "expense")}
              className={`px-3 py-1.5 ${
                c.type === "expense"
                  ? "bg-expense"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  c.type === "expense" ? "text-white" : "text-muted dark:text-muted-dark"
                }`}
              >
                Gasto
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCandidateType(c.id, "income")}
              className={`px-3 py-1.5 ${
                c.type === "income"
                  ? "bg-income"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  c.type === "income" ? "text-white" : "text-muted dark:text-muted-dark"
                }`}
              >
                Ingreso
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCandidateType(c.id, "transfer")}
              className={`px-3 py-1.5 ${
                isTransfer
                  ? "bg-accent dark:bg-accent-dark"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isTransfer ? "text-white" : "text-muted dark:text-muted-dark"
                }`}
              >
                Transf.
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Fecha y valor */}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextInput
              className={`rounded-xl border px-3 py-2 text-sm text-ink dark:text-ink-dark bg-deepSoft dark:bg-deepSoft-dark ${
                missingSet.has("date")
                  ? INVALID_BORDER
                  : VALID_BORDER
              }`}
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#9ca3af"
              value={c.dateText}
              onChangeText={(dateText) => updateCandidate(c.id, { dateText })}
              keyboardType="numbers-and-punctuation"
            />
            {missingSet.has("date") ? (
              <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
                Falta la fecha
              </Text>
            ) : null}
          </View>
          <View className="flex-1">
            <TextInput
              className={`rounded-xl border px-3 py-2 text-sm text-ink dark:text-ink-dark bg-deepSoft dark:bg-deepSoft-dark ${
                missingSet.has("amount")
                  ? INVALID_BORDER
                  : VALID_BORDER
              }`}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={amountText}
              onChangeText={(text) => {
                setAmountDrafts((d) => ({ ...d, [c.id]: text }));
                updateCandidate(c.id, { amountText: text });
              }}
              keyboardType="decimal-pad"
            />
            {missingSet.has("amount") ? (
              <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
                Falta el valor
              </Text>
            ) : null}
          </View>
        </View>
        {parsed !== 0 ? (
          <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
            {formatCOP(Math.abs(parsed))} COP
          </Text>
        ) : null}

        {/* Descripción */}
        <TextInput
          className={`mt-2 rounded-xl border px-3 py-2 text-sm text-ink dark:text-ink-dark bg-deepSoft dark:bg-deepSoft-dark ${
            missingSet.has("description")
              ? INVALID_BORDER
              : VALID_BORDER
          }`}
          placeholder="Descripción"
          placeholderTextColor="#9ca3af"
          value={c.description}
          onChangeText={(description) => updateCandidate(c.id, { description })}
          multiline
        />
        {missingSet.has("description") ? (
          <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
            Falta la descripción
          </Text>
        ) : null}

        {/* Destino de transferencia */}
        {isTransfer ? (
          <View
            className={`mt-2 rounded-xl border p-2.5 ${
              missingSet.has("transferTarget") ||
              missingSet.has("destination") ||
              missingSet.has("person")
                ? INVALID_BORDER
                : "border-transparent"
            }`}
          >
            <Text className="mb-1.5 text-xs font-medium text-muted dark:text-muted-dark">
              Destino
            </Text>

            <View className="flex-row gap-2 mb-2">
              {(
                [
                  { value: "own", label: "Mis cuentas" },
                  { value: "person", label: "Otra persona" },
                ] as const
              ).map((target) => {
                const active = c.transferTarget === target.value;
                return (
                  <Pressable
                    key={target.value}
                    onPress={() =>
                      updateCandidate(c.id, {
                        transferTarget: target.value,
                        destinationAccountId:
                          target.value === "person" ? null : c.destinationAccountId,
                      })
                    }
                    className={`flex-1 items-center rounded-xl border px-3 py-2 ${
                      active
                        ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                        : missingSet.has("transferTarget")
                          ? INVALID_BORDER
                          : VALID_BORDER
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        active
                          ? "text-accent dark:text-accent-dark"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {target.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {missingSet.has("transferTarget") ? (
              <Text className="mb-2 text-[11px] text-expense dark:text-expense-dark">
                Selecciona un destino
              </Text>
            ) : null}

            {c.transferTarget === "own" ? (
              destinationOptions.length === 0 ? (
                <Text className="text-xs text-muted dark:text-muted-dark">
                  Crea otra cuenta para poder transferir entre tus cuentas.
                </Text>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                  >
                    {destinationOptions.map((acc) => {
                      const active = c.destinationAccountId === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() =>
                            updateCandidate(c.id, {
                              destinationAccountId: acc.id,
                            })
                          }
                          className={`mx-1 rounded-2xl border px-3 py-2 ${
                            active
                              ? "border-accent dark:border-accent-dark bg-accent/10 dark:bg-accent-dark/10"
                              : "border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark"
                          }`}
                        >
                          <Text
                            numberOfLines={1}
                            className={`text-xs font-semibold ${
                              active
                                ? "text-accent dark:text-accent-dark"
                                : "text-ink dark:text-ink-dark"
                            }`}
                            style={{ maxWidth: 160 }}
                          >
                            {acc.name}
                          </Text>
                          <Text
                            className={`text-[10px] mt-0.5 ${
                              active
                                ? "text-accent/80 dark:text-accent-dark/80"
                                : "text-muted dark:text-muted-dark"
                            }`}
                          >
                            {acc.currency}{" "}
                            {Number(acc.balance ?? 0).toLocaleString("es-CO")}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {missingSet.has("destination") ? (
                    <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
                      Selecciona la cuenta destino
                    </Text>
                  ) : null}
                </>
              )
            ) : (
              <>
                <TextInput
                  className={`rounded-xl border px-3 py-2 text-sm text-ink dark:text-ink-dark bg-deepSoft dark:bg-deepSoft-dark ${
                    missingSet.has("person")
                      ? INVALID_BORDER
                      : VALID_BORDER
                  }`}
                  placeholder="Nombre de la persona"
                  placeholderTextColor="#9ca3af"
                  value={c.personName}
                  onChangeText={(personName) =>
                    updateCandidate(c.id, { personName })
                  }
                />
                {missingSet.has("person") ? (
                  <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
                    Escribe el nombre de la persona
                  </Text>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {/* Categoría */}
        {!isTransfer ? (
        <Pressable
          onPress={() => setCategoryPickerFor({ kind: "candidate", id: c.id })}
          className={`mt-2 flex-row items-center justify-between rounded-xl border bg-deepSoft dark:bg-deepSoft-dark px-3 py-2.5 ${
            missingSet.has("category")
              ? INVALID_BORDER
              : VALID_BORDER
          }`}
        >
          <Text
            className={`text-sm ${
              c.categoryId
                ? "text-ink dark:text-ink-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {categories.find((cat) => cat.id === c.categoryId)?.name ??
              "Categoría"}
          </Text>
          <Text className="text-xs text-muted dark:text-muted-dark">▾</Text>
        </Pressable>
        ) : null}
        {!isTransfer && missingSet.has("category") ? (
          <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
            Selecciona una categoría
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View
        className="flex-1 bg-panel dark:bg-panel-dark"
        style={{ paddingTop: insets.top }}
      >
        {/* Fondo plano: un SVG a pantalla completa dentro de un Modal nativo
            escala el bitmap a resolución de píxel y en Android revienta el
            límite de Canvas (trying to draw too large bitmap). */}
        <View className="absolute inset-0 bg-panel dark:bg-panel-dark" />

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink dark:text-ink-dark">
              Verificar movimientos
            </Text>
            <Text className="text-xs text-muted dark:text-muted-dark">
              Revisa, edita y confirma antes de guardar.
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            disabled={saving}
            className="rounded-full border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-2"
          >
            <Text className="text-sm font-medium text-ink dark:text-ink-dark">Cancelar</Text>
          </Pressable>
        </View>

        {error ? (
          <View className="mx-5 mb-2 flex-row items-center justify-between rounded-xl border border-expense/30 bg-expense/10 px-4 py-2">
            <Text className="flex-1 pr-2 text-xs text-expense dark:text-expense-dark">
              {error}
            </Text>
            <Pressable onPress={clearError}>
              <Text className="text-xs font-semibold text-expense dark:text-expense-dark">OK</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Cuenta destino */}
        <View className="px-5 pb-1">
          <Text className="mb-1 text-xs font-medium text-muted dark:text-muted-dark">
            Cuenta de destino
          </Text>
          <Dropdown
            options={accounts.map((a) => ({
              label: a.name,
              value: a.id,
            }))}
            value={accountId ?? ""}
            onSelect={setAccountId}
            placeholder="Selecciona una cuenta"
            invalid={!accountId}
          />
          {!accountId ? (
            <Text className="mt-1 text-[11px] text-expense dark:text-expense-dark">
              Selecciona la cuenta de destino
            </Text>
          ) : null}

          {/* Periodo del extracto (rango de fechas) */}
          <View className="mt-3 rounded-xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-4 py-2.5">
            {editingPeriod ? (
              <View>
                <Text className="mb-1.5 text-[11px] font-medium text-muted dark:text-muted-dark">
                  Periodo del extracto (dd/mm/aaaa)
                </Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2 text-sm text-ink dark:text-ink-dark"
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#9ca3af"
                    value={periodFromDraft}
                    onChangeText={setPeriodFromDraft}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text className="text-xs text-muted dark:text-muted-dark">a</Text>
                  <TextInput
                    className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-3 py-2 text-sm text-ink dark:text-ink-dark"
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#9ca3af"
                    value={periodToDraft}
                    onChangeText={setPeriodToDraft}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                {periodError ? (
                  <Text className="mt-1 text-[11px] leading-snug text-expense dark:text-expense-dark">
                    ⚠️ {periodError}
                  </Text>
                ) : null}
                <View className="mt-2 flex-row justify-end gap-2">
                  <Pressable
                    onPress={() => {
                      setEditingPeriod(false);
                      setPeriodError(null);
                    }}
                    className="rounded-lg border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-muted dark:text-muted-dark">
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={applyPeriod}
                    className="rounded-lg bg-accent dark:bg-accent-dark px-3 py-1.5"
                  >
                    <Text className="text-xs font-semibold text-white">Aplicar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={startEditingPeriod}
                className="flex-row items-center justify-between"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-[11px] font-medium text-muted dark:text-muted-dark">
                    Periodo del extracto
                  </Text>
                  <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                    {period
                      ? `${formatDateText(period.from)} — ${formatDateText(period.to)}`
                      : "No detectado"}
                  </Text>
                  {outOfRangeCount > 0 ? (
                    <Text className="mt-0.5 text-[11px] leading-snug text-expense dark:text-expense-dark">
                      ⚠️ {outOfRangeCount} movimiento(s) con fecha fuera del
                      periodo.
                    </Text>
                  ) : null}
                </View>
                <Text className="text-xs font-semibold text-accent dark:text-accent-dark">
                  Editar
                </Text>
              </Pressable>
            )}
          </View>

          <View className="mt-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
            <Text className="text-[11px] leading-snug text-muted dark:text-muted-dark">
              🔒 Tu extracto se procesa en tu dispositivo. Los datos sensibles
              (números de cuenta, tarjetas, nombres) se redactan y nunca se
              envían a la IA.
            </Text>
            {unparsedCount > 0 ? (
              <Text className="mt-1.5 text-[11px] leading-snug text-expense dark:text-expense-dark">
                ⚠️ {unparsedCount} línea(s) no se pudieron interpretar. Puedes
                agregarlas manualmente después.
              </Text>
            ) : null}
          </View>
        </View>

        {/* Paginación: el usuario pasa de página en vez de renderizar todo */}
        {pageNumbers.length > 1 ? (
          <View className="mx-5 mb-2 mt-1 flex-row items-center justify-between">
            <Pressable
              onPress={() => setCurrentPage((p) => p - 1)}
              disabled={safeCurrentPage === pageNumbers[0]}
              className={`h-9 rounded-xl border border-black/10 dark:border-white/10 px-3 ${
                safeCurrentPage === pageNumbers[0]
                  ? "opacity-40"
                  : "bg-panel dark:bg-panel-dark"
              }`}
            >
              <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                ◀ Anterior
              </Text>
            </Pressable>
            <Text className="text-xs font-bold text-ink dark:text-ink-dark">
              Página {pageNumbers.indexOf(safeCurrentPage) + 1} de{" "}
              {pageNumbers.length}
            </Text>
            <Pressable
              onPress={() => setCurrentPage((p) => p + 1)}
              disabled={safeCurrentPage === pageNumbers[pageNumbers.length - 1]}
              className={`h-9 rounded-xl border border-black/10 dark:border-white/10 px-3 ${
                safeCurrentPage === pageNumbers[pageNumbers.length - 1]
                  ? "opacity-40"
                  : "bg-panel dark:bg-panel-dark"
              }`}
            >
              <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                Siguiente ▶
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Lista */}
        <ScrollView
          className="flex-1 px-5 pt-2"
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
        >
          {candidates.length === 0 ? (
            <View className="mb-3 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3">
              <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                No se detectaron movimientos automáticamente
              </Text>
              <Text className="mt-1 text-xs leading-snug text-muted dark:text-muted-dark">
                El texto del extracto se leyó, pero no se reconocieron filas de
                movimientos. Toca las líneas de abajo que sí sean movimientos,
                o agrégalos manualmente.
              </Text>
              <Pressable
                onPress={() => addManual()}
                className="mt-3 h-11 items-center justify-center rounded-xl bg-accent dark:bg-accent-dark"
              >
                <Text className="text-sm font-semibold text-white">
                  ➕ Agregar movimiento manual
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mb-2 flex-row gap-2">
              <Pressable
                onPress={() => addManual()}
                className="h-10 flex-1 items-center justify-center rounded-xl border border-dashed border-black/20 dark:border-white/20"
              >
                <Text className="text-sm font-semibold text-muted dark:text-muted-dark">
                  ➕ Agregar manual
                </Text>
              </Pressable>
              {pages.length > 0 ? (
                <Pressable
                  onPress={() => setShowRaw((v) => !v)}
                  className="h-10 flex-1 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-3"
                >
                  <Text className="text-sm font-medium text-ink dark:text-ink-dark">
                    📄 Ver texto {showRaw ? "▲" : "▼"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Texto en bruto de la página actual (se muestra PRIMERO para que
              se vea y se copie de inmediato, sin quedar escondido debajo de
              los movimientos) */}
          {showRaw && currentPageLines.length > 0 ? (
            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                <Text className="text-xs font-bold text-accent dark:text-accent-dark">
                  📄 Texto · Página {safeCurrentPage}
                </Text>
                <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                  {currentPageLines.length} línea(s)
                </Text>
              </View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="flex-1 pr-2 text-xs font-medium text-muted dark:text-muted-dark">
                  Toca una línea para agregarla como movimiento (o reconstruirla
                  si salió mal)
                </Text>
                <Pressable
                  onPress={() =>
                    Share.share({
                      message:
                        currentPageLines.join("\n") +
                        "\n\n(Texto ya redactado; copiado para diagnóstico.)",
                    })
                  }
                  className="rounded-lg border border-black/10 dark:border-white/10 bg-panel dark:bg-panel-dark px-2 py-1"
                >
                  <Text className="text-[11px] font-medium text-ink dark:text-ink-dark">
                    Compartir texto
                  </Text>
                </Pressable>
              </View>
              {renderPageLines({ page: safeCurrentPage, lines: currentPageLines })}
            </View>
          ) : null}

          {/* Movimientos de la página actual */}
          {!showRaw && currentPageCandidates.length > 0 ? (
            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                <Text className="text-xs font-bold text-accent dark:text-accent-dark">
                  📄 Página {safeCurrentPage}
                </Text>
                <Text className="text-xs font-semibold text-ink dark:text-ink-dark">
                  {currentPageCandidates.length} movimientos ·{" "}
                  {formatCOP(
                    currentPageCandidates
                      .filter((c) => c.selected)
                      .reduce((acc, c) => acc + Math.abs(c.amount ?? 0), 0),
                  )}{" "}
                  COP
                </Text>
              </View>
              {renderGroupedCandidates()}
            </View>
          ) : null}

          {/* Líneas de la página actual cuando no se detectó nada */}
          {!showRaw &&
          currentPageLines.length > 0 &&
          currentPageCandidates.length === 0 ? (
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-medium text-muted dark:text-muted-dark">
                Líneas del extracto (toca las que son movimientos)
              </Text>
              {renderPageLines({ page: safeCurrentPage, lines: currentPageLines })}
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View
          className="border-t border-black/10 dark:border-white/10 px-5 py-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Text
            className={`mb-2 text-center text-xs ${
              incompleteCount > 0 && selectedCount > 0
                ? "font-semibold text-expense dark:text-expense-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {incompleteCount > 0 && selectedCount > 0
              ? `⚠️ ${incompleteCount} movimiento(s) incompleto(s). Completa los campos en rojo.`
              : selectedCount > 0
                ? `${selectedCount} movimientos · ${formatCOP(selectedTotal)} COP`
                : "Sin movimientos seleccionados"}
          </Text>
          <Pressable
            onPress={handleConfirm}
            disabled={saving || selectedCount === 0}
            style={({ pressed }) =>
              pressed && !saving ? { opacity: 0.75 } : null
            }
            className={`h-12 items-center justify-center rounded-xl ${
              saving
                ? "bg-accent dark:bg-accent-dark"
                : selectedCount === 0
                  ? "bg-black/10 dark:bg-white/10"
                  : incompleteCount > 0
                    ? "bg-amber-500"
                    : "bg-accent dark:bg-accent-dark"
            }`}
          >
            {saving ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-base font-semibold text-white">
                  Guardando…
                </Text>
              </View>
            ) : (
              <Text className="text-base font-semibold text-white">
                Confirmar y guardar
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Selector de categoría (bottom sheet) */}
      <Modal
        visible={!!categoryPickerFor}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerFor(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setCategoryPickerFor(null)}
        >
          <Pressable
            className="rounded-t-3xl border-t border-black/10 bg-panel dark:bg-panel-dark p-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            onPress={() => {}}
          >
            <Text className="text-lg font-bold text-ink dark:text-ink-dark">
              {categoryPickerFor?.kind === "group"
                ? "Categoría para el grupo"
                : "Categoría del movimiento"}
            </Text>
            {(() => {
              const picker = categoryPickerFor;
              if (!picker) return null;
              const isGroup = picker.kind === "group";
              const target = isGroup
                ? pageGroups.find(([k]) => k === picker.key)?.[1]?.[0]
                : candidates.find((c) => c.id === picker.id);
              if (!target) return null;
              const activeCategoryId = target.categoryId;
              const options = categories.filter(
                (cat) => cat.type === target.type,
              );
              return (
                <ScrollView
                  className="mt-3"
                  style={{ maxHeight: 380 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <Pressable
                    onPress={() => {
                      if (isGroup) {
                        applyGroupCategory(picker.key, null);
                      } else {
                        updateCandidate(picker.id, { categoryId: null });
                      }
                      setCategoryPickerFor(null);
                    }}
                    className="rounded-xl px-3 py-3"
                  >
                    <Text className="text-sm text-muted dark:text-muted-dark">
                      Sin categoría
                    </Text>
                  </Pressable>
                  {options.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        if (isGroup) {
                          applyGroupCategory(picker.key, cat.id);
                        } else {
                          updateCandidate(picker.id, {
                            categoryId: cat.id,
                          });
                        }
                        setCategoryPickerFor(null);
                      }}
                      className={`rounded-xl px-3 py-3 ${
                        activeCategoryId === cat.id
                          ? "bg-accent/10 dark:bg-accent-dark/10"
                          : "bg-transparent"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <PremiumIcon
                          token={cat.iconImage}
                          size={22}
                          radius={7}
                          fallback="📁"
                        />
                        <Text
                          className={`ml-2 text-sm ${
                            activeCategoryId === cat.id
                              ? "font-semibold text-accent dark:text-accent-dark"
                              : "text-ink dark:text-ink-dark"
                          }`}
                        >
                          {cat.name}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
