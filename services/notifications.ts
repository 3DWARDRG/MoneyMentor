import * as Notifications from "expo-notifications";
import { sep } from "path/win32";
import { stringify } from "querystring";

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

    // 1. Usa Notifications.getPermissionsAsync() para obtener los permisos actuales.
    // Guarda el resultado en una constante (ej. const currentStatus).
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
    return false; // Si algo explota (ej. estamos en un simulador sin soporte), asumimos que no hay permiso.
  }
};

export const scheduleTestNotification = async (title: string, amount: number) => {
  try {
    const triggerInSeconds = 5;

    const notificationId = await Notifications.scheduleNotificationAsync({
      // 1. El contenido de tu notificación
      content: {
        title: "¡Recordatorio de Pago! 🚨",
        body: `No olvides pagar ${title} por un monto de $${amount}.`,
        sound: true, // Le decimos que haga ruido
      },
      
      // 2. El gatillo (Trigger)
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
  amount: number, // Asumo que el monto lo sacas de otra tabla o de la descripción
  startDateTimestamp: number,
  category: string
): Promise<string | null> => {
  try {
    // 1. Convierte el startDateTimestamp a un objeto Date de JavaScript.
    // PISTA: new Date(numero)
      const targetDate =  new Date (startDateTimestamp)

      targetDate.setHours(9, 0, 0, 0);

    // 2. Verifica si la fecha está en el pasado (compara con Date.now()).
    // Si ya pasó, haz return null;
    if (targetDate.getTime() < Date.now()) {
      console.log("La fecha del evento ya pasó o son más de las 9:00 AM hoy. No se programará alarma.");
      return null; 
    }

    // 3. Ajuste de Hora: Pon la alarma a las 9:00 AM de ese día.
    // PISTA: tuVariableDate.setHours(9, 0, 0, 0);
    

    // 4. Lógica de Categorías (¡Tu idea!)
    // Crea una variable para el mensaje. Usa un if/else o switch basado en 'category'.
    let bodyMessage = "";
    if (category === "Ahorro") {
      bodyMessage = `¡Hora de pagarte a ti mismo! Separa $${amount} para tu meta de ${title}.`;
    } else {
      bodyMessage = `Hoy es el día límite para pagar ${title} por $${amount}.`;
    }

    // 5. Programa la notificación.
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
    
    // 6. Retorna el ID
    return notificationId; 

  } catch (error) {
    console.error("Error al programar el recordatorio:", error);
    return null;
  }
};


export const cancelScheduledNotification = async (notificationId: string) => {

}