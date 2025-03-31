export interface NotificationPayload {
  title: string;
  body: string;
  category: string;
  dnpName: string;
  callToAction?: {
    title: string;
    url: string;
  };
  errors?: string;
}
