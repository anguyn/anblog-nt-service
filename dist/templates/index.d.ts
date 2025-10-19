export declare function renderEmailTemplate(template: string, data: Record<string, any>): any;
declare function verifyEmailTemplate(data: {
    name: string;
    verificationUrl: string;
    locale: string;
}): {
    html: string;
    text: string;
};
declare function passwordResetTemplate(data: {
    name: string;
    resetUrl: string;
    locale: string;
}): {
    html: string;
    text: string;
};
declare function welcomeTemplate(data: {
    name: string;
    locale: string;
}): {
    html: string;
    text: string;
};
declare function newPostNotificationTemplate(data: {
    subscriberName: string;
    authorName: string;
    postTitle: string;
    postExcerpt: string;
    postUrl: string;
    unsubscribeUrl: string;
    locale: string;
}): {
    html: string;
    text: string;
};
export { verifyEmailTemplate, passwordResetTemplate, welcomeTemplate, newPostNotificationTemplate };
//# sourceMappingURL=index.d.ts.map