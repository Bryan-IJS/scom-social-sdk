import { IMqttClientOptions } from "./common";
import { ISocialEventManagerRead } from "./eventManagerRead";
import { IMarketplaceOrder } from "./marketplace";
export declare namespace SocialDataManagerOptions {
    interface IFetchUserEthWalletAccountsInfo {
        walletHash?: string;
        pubKey?: string;
    }
    interface IPlaceMarketplaceOrder {
        merchantId: string;
        stallId: string;
        stallPublicKey: string;
        order: IMarketplaceOrder;
    }
    interface IFetchProductPostPurchaseContent {
        sellerPubkey: string;
        productId: string;
        postPurchaseContent: string;
        gatekeeperPubkey?: string;
        encryptedContentKey?: string;
    }
    interface IFetchProductPurchaseStatus {
        sellerPubkey: string;
        productId: string;
    }
    interface IFetchCommunityProducts {
        creatorId: string;
        communityId: string;
        stallId?: string;
        decryptPostPurchaseContent?: boolean;
    }
    interface IFetchMarketplaceProductDetails {
        stallId: string;
        productIds: string[];
        decryptPostPurchaseContent?: boolean;
    }
    interface IFetchReservationsByRole {
        role: 'provider' | 'user';
        since?: number;
        until?: number;
    }
    interface IFetchUserCommunityScores {
        pubKey: string;
        creatorId?: string;
        communityId?: string;
    }
}
export interface ISocialDataManagerConfig {
    version?: 1 | 1.5 | 2;
    writeRelays?: string[];
    readRelay?: string;
    readManager?: ISocialEventManagerRead;
    publicIndexingRelay?: string;
    apiBaseUrl?: string;
    ipLocationServiceBaseUrl?: string;
    ipLocationServiceApiKey?: string;
    mqttBrokerUrl?: string;
    mqttClientOptions?: IMqttClientOptions;
    mqttSubscriptions?: string[];
    mqttMessageCallback?: (topic: string, message: string) => void;
    enableLightningWallet?: boolean;
}
export interface ICheckRelayStatusResult {
    success: boolean;
    error?: string;
    npub?: string;
    userProfileExists?: boolean;
    isPrivate?: boolean;
}
