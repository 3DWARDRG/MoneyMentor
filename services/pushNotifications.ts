import * as Notifications from "expo-notifications";

// Le decimos al sistema cómo comportarse si la app está abierta cuando llega la notificación
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestPushPermissions = async (): Promise<boolean> => {
  try {
    const currentStatus = await Notifications.getPermissionsAsync();

    if (currentStatus.status === "granted") {
      return true;
    }

    const requestStatus = await Notifications.requestPermissionsAsync();

    if (requestStatus.status === "granted") {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error al solicitar permisos:", error);
    return false;
  }
};

export const scheduleTestNotification = async (title: string, amount: number) => {
  try {
    const triggerInSeconds = 5;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "¡Recordatorio de Pago! 🚨",
        body: `No olvides pagar ${title} por un monto de $${amount}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerInSeconds,
      },
    });

    console.log("¡Notificación programada con ID:", notificationId);
    return notificationId;
  } catch (error) {
    console.error("Error al programar la notificación:", error);
  }
};

export const scheduleEventNotification = async (
  title: string,
  amount: number,
  startDateTimestamp: number,
  category: string
): Promise<string | null> => {
  try {
    // 1. Convierte el startDateTimestamp a un objeto Date y ajusta a las 9:00 AM.
    const targetDate = new Date(startDateTimestamp);
    targetDate.setHours(9, 0, 0, 0);

    // 2. Si la fecha ya pasó, no se programa.
    if (targetDate.getTime() < Date.now()) {
      console.log(
        "La fecha del evento ya pasó o son más de las 9:00 AM hoy. No se programará alarma."
      );
      return null;
    }

    // 3. Mensaje según categoría.
    let bodyMessage = "";
    if (category === "Ahorro") {
      bodyMessage = `¡Hora de pagarte a ti mismo! Separa $${amount} para tu meta de ${title}.`;
    } else {
      bodyMessage = `Hoy es el día límite para pagar ${title} por $${amount}.`;
    }

    // 4. Programa la notificación.
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: category === "Ahorro" ? "Meta de Ahorro 🌱" : "¡Pago Pendiente! 🚨",
        body: bodyMessage,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });

    console.log(`Notificación programada para ${title} con ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error("Error al programar el recordatorio:", error);
    return null;
  }
};

export const cancelScheduledNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Error al cancelar la notificación:", error);
  }
};
