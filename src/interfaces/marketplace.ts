import { INostrEvent } from "./common";
import { IPaymentActivityV2, IUserProfile } from "./misc";

export enum MarketplaceProductType {
	Physical = "Physical",
	Digital = "Digital",
	Course = "Course",
	Ebook = "Ebook",
	Membership = "Membership",
	Bundle = "Bundle",
	Reservation = "Reservation",
}

export interface IMarketplaceStallShipping {
	id: string;
	name?: string;
	cost: number;
	regions?: string[];
	amountWithOthers?: number;
}

export interface ICryptoPayoutOption {
	cryptoCode: string; 
	networkCode: string; 
	tokenAddress?: string;
	walletAddress: string; 
}

export interface IRewardsPointsOption {
	creatorId: string;
	communityId: string;
	exchangeRate: number;
	upperBoundary?: number;
}

export interface IPayoutSettings {
	cryptoOptions: ICryptoPayoutOption[];
	rewardsPoints: IRewardsPointsOption[];
	stripeAccountId?: string;
}

export interface IMarketplaceStallBasicInfo {
	merchantId: string;
	stallId: string;
}

export interface IMarketplaceStall {
	id: string;
	name: string;
	description?: string;
	currency: string;
	shipping?: IMarketplaceStallShipping[];
	payout?: IPayoutSettings;
	stallPublicKey?: string;
	encryptedStallSecret?: string;
	gatekeeperPubkey?: string;
}

export interface IMarketplaceProduct {
	id: string;
	stallId: string;
	productType: MarketplaceProductType;
	name: string;
	description?: string;
	images?: string[];
	thumbnail?: string;
	currency: string;
	price: number;
	quantity: number;
	specs?: string[][];
	shipping?: IMarketplaceStallShipping[];
	postPurchaseContent?: string;
	gatekeeperPubkey?: string;
	encryptedContentKey?: string;
	reservations?: IMarketplaceReservation[];
}

export interface IMarketplaceReservation {
	parentProductId: string;
	id: string; //product variant id
	time: number;
	providerName: string;
	serviceName: string;
	duration: number;
	durationUnit: string;
	price: number;
	currency: string;
	capacity?: number;
}

export interface IReservation {
	orderId: string;
	serviceId: string;
	providerPubkey: string;
	userPubkey: string;
	reservationTime: number;
}

export interface IMarketplaceWorkingHours {
	checked?: boolean;
	startTime?: number;
	endTime?: number;
}

export interface IMarketplaceService {
	id: string;
	name: string;
	duration: number;
	durationUnit: string;
	price: number;
	currency: string;
	capacity?: number;
}

export interface IMarketplaceReservationV0 {
	workingHours: { [key: string]: IMarketplaceWorkingHours };
	providers: { id: string; name: string }[];
	services: IMarketplaceService[];
}

export interface ICommunityStallInfo extends IMarketplaceStall {
	communityUri?: string;
	eventData?: INostrEvent;
}

export interface ICommunityProductInfo extends IMarketplaceProduct {
	communityUri?: string;
	stallUri?: string;
	eventData?: INostrEvent;
}

export interface IRegion {
	code: string;
	name: string;
}

export interface ICurrency {
	code: string;
	name: string;
	type: "crypto" | "fiat" | "rewards-points";
}

export interface ICryptocurrency {
	cryptoCode: string;
	networkCode: string;
	cryptoName: string;
	networkName: string;
	chainId?: string;
	tokenAddress?: string;
	tokenDecimals?: number;
}

export interface IMarketplaceOrderItem {
	productId: string;
	productName?: string;
	quantity: number;
	price?: number;
	reservationTime?: number;
}

export interface IRewardsPoints {
	creatorId: string;
	communityId: string;
	points: number;
}

export interface IMarketplaceOrder {
	id: string;
	name?: string;
	address?: string;
	message?: string;
	contact: {
		nostr: string;
		phone?: string;
		email?: string;
	};
	items: IMarketplaceOrderItem[];
	currency?: string;
	shippingId?: string;
	shippingCost?: number;
	totalAmount?: number;
	rewardsPoints?: IRewardsPoints;
}

export interface IRetrievedMarketplaceOrder extends IMarketplaceOrder {
	stallId?: string;
	stallName?: string;
	createdAt: number;
	orderStatus?: SellerOrderStatus;
	items: IMarketplaceOrderItem[];
	userProfile?: IUserProfile;
	paymentActivity?: IPaymentActivityV2;
}

export interface IRetrievedBuyerOrder extends IRetrievedMarketplaceOrder {
	status: BuyerOrderStatus;
	productDetails?: ICommunityProductInfo[];
}

export interface IMarketplaceOrderPaymentOption {
	type: string;
	link: string;
}

export interface IMarketplaceOrderPaymentRequest {
	id: string;
	message?: string;
	paymentOptions: IMarketplaceOrderPaymentOption[];
}

export interface IMarketplaceOrderUpdateInfo {
	id: string;
	message?: string;
	status: SellerOrderStatus;
	shippingDetails?: {
        carrier?: string; 
        trackingNumber?: string;
        estimatedDeliveryDate?: number;
    };
    cancellationDetails?: {
        reason: string; 
        refundedAmount?: number; 
    };
}

export enum SellerOrderStatus {
	Pending = "pending",
	Processing = "processing",
	Shipped = "shipped",
	Delivered = "delivered",
	Canceled = "canceled"
}

export enum BuyerOrderStatus {
	Unpaid = "unpaid",
	Paid = "paid",
	Shipped = "shipped",
	Delivered = "delivered",
	Canceled = "canceled"
}