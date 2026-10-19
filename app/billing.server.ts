type AdminGraphqlClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ json(): Promise<any> }>;
};

export interface ActiveSubscription {
  id: string;
  name: string;
  status: string;
  test: boolean;
  currentPeriodEnd: string | null;
}

export async function getCurrentSubscription(
  admin: AdminGraphqlClient,
): Promise<ActiveSubscription | null> {
  const response = await admin.graphql(`#graphql
    query CurrentSubscription {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          test
          currentPeriodEnd
        }
      }
    }
  `);
  const result = (await response.json()) as {
    data?: {
      currentAppInstallation: { activeSubscriptions: ActiveSubscription[] };
    };
    errors?: Array<{ message: string }>;
  };

  if (result.errors?.length) {
    throw new Error(
      `Could not look up active subscription: ${result.errors.map((e) => e.message).join("; ")}`,
    );
  }

  const subscriptions = result.data?.currentAppInstallation.activeSubscriptions ?? [];
  return subscriptions[0] ?? null;
}

export async function createAppSubscription(
  admin: AdminGraphqlClient,
  options: { name: string; price: string; returnUrl: string; test: boolean },
): Promise<string> {
  const response = await admin.graphql(
    `#graphql
    mutation CreateAppSubscription(
      $name: String!
      $returnUrl: URL!
      $test: Boolean!
      $price: Decimal!
    ) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: $test
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: $price, currencyCode: USD }
                interval: EVERY_30_DAYS
              }
            }
          }
        ]
      ) {
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        name: options.name,
        returnUrl: options.returnUrl,
        test: options.test,
        price: options.price,
      },
    },
  );

  const result = (await response.json()) as {
    data?: {
      appSubscriptionCreate: {
        confirmationUrl: string | null;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (result.errors?.length) {
    throw new Error(
      `Could not create subscription: ${result.errors.map((e) => e.message).join("; ")}`,
    );
  }

  const data = result.data?.appSubscriptionCreate;
  if (!data || data.userErrors.length > 0) {
    throw new Error(
      data?.userErrors.map((e) => e.message).join("; ") ||
        "Could not create subscription.",
    );
  }

  if (!data.confirmationUrl) {
    throw new Error("Shopify did not return a confirmation URL for this charge.");
  }

  return data.confirmationUrl;
}

export async function cancelAppSubscription(
  admin: AdminGraphqlClient,
  subscriptionId: string,
): Promise<void> {
  const response = await admin.graphql(
    `#graphql
    mutation CancelAppSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { id: subscriptionId } },
  );

  const result = (await response.json()) as {
    data?: {
      appSubscriptionCancel: {
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (result.errors?.length) {
    throw new Error(
      `Could not cancel subscription: ${result.errors.map((e) => e.message).join("; ")}`,
    );
  }

  const userErrors = result.data?.appSubscriptionCancel.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join("; "));
  }
}
