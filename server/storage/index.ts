import { UserStorage } from "./user";
import { ContentStorage } from "./content";
import { CommerceStorage } from "./commerce";
import { AnalyticsStorage } from "./analytics";
import { AdStorage } from "./ads";
import { NFTStorage } from "./nft";
import { FanClubStorage } from "./fanclub-storage";
import { DAOStorage } from "./dao-storage";
import { LoyaltyStorage } from "./loyalty-storage";
import { CollectionStorage } from "./collection-storage";
import { IStorage } from "./base";

// Composite storage class that combines all storage modules
export class MongoStorage implements IStorage {
  private userStorage: UserStorage;
  private contentStorage: ContentStorage;
  private commerceStorage: CommerceStorage;
  private analyticsStorage: AnalyticsStorage;
  private adStorage: AdStorage;
  private nftStorage: NFTStorage;
  private fanClubStorage: FanClubStorage;
  private daoStorage: DAOStorage;
  private loyaltyStorage: LoyaltyStorage;
  private collectionStorage: CollectionStorage;

  constructor() {
    this.userStorage = new UserStorage();
    this.contentStorage = new ContentStorage();
    this.commerceStorage = new CommerceStorage();
    this.analyticsStorage = new AnalyticsStorage();
    this.adStorage = new AdStorage();
    this.nftStorage = new NFTStorage();
    this.fanClubStorage = new FanClubStorage(this.userStorage.db);
    this.daoStorage = new DAOStorage(this.userStorage.db);
    this.loyaltyStorage = new LoyaltyStorage(this.userStorage.db);
    this.collectionStorage = new CollectionStorage(this.userStorage.db);
  }

  async connect(): Promise<void> {
    await this.userStorage.connect();
    // All storage classes share the same database connection
  }

  async disconnect(): Promise<void> {
    await this.userStorage.disconnect();
  }

  // User methods - delegate to UserStorage
  async getUser(id: string) { return this.userStorage.getUser(id); }
  async getUserByEmail(email: string) { return this.userStorage.getUserByEmail(email); }
  async createUser(user: any) { return this.userStorage.createUser(user); }
  async updateUser(id: string, updates: Partial<any>) { return this.userStorage.updateUser(id, updates); }
  async deleteUser(id: string) { return this.userStorage.deleteUser(id); }
  async getArtistByUserId(userId: string) { return this.userStorage.getArtistByUserId(userId); }
  async getFeaturedArtists(limit?: number) { return this.userStorage.getFeaturedArtists(limit); }
  async getAllArtists(limit?: number) { return this.userStorage.getAllArtists(limit); }
  async searchArtists(query: string) { return this.userStorage.searchArtists(query); }

  // Content methods - delegate to ContentStorage
  async getSong(id: string) { return this.contentStorage.getSong(id); }
  async getSongsByArtist(artistId: string) { return this.contentStorage.getSongsByArtist(artistId); }
  async createSong(song: any) { return this.contentStorage.createSong(song); }
  async updateSong(id: string, updates: Partial<any>) { return this.contentStorage.updateSong(id, updates); }
  async deleteSong(id: string) { return this.contentStorage.deleteSong(id); }
  async getTrendingSongs(limit?: number) { return this.contentStorage.getTrendingSongs(limit); }
  async searchSongs(query: string) { return this.contentStorage.searchSongs(query); }
  async getAllSongs(options?: { genre?: string; sort?: string; limit?: number }) { return this.contentStorage.getAllSongs(options); }

  async getMerch(id: string) { return this.contentStorage.getMerch(id); }
  async getMerchByArtist(artistId: string) { return this.contentStorage.getMerchByArtist(artistId); }
  async createMerch(merch: any) { return this.contentStorage.createMerch(merch); }
  async updateMerch(id: string, updates: Partial<any>) { return this.contentStorage.updateMerch(id, updates); }
  async deleteMerch(id: string) { return this.contentStorage.deleteMerch(id); }
  async getAllMerch() { return this.contentStorage.getAllMerch(); }
  async getAllMerchFiltered(filters: any) { return this.contentStorage.getAllMerchFiltered(filters); }
  async searchMerch(query: string) { return this.contentStorage.searchMerch(query); }
  async searchEvents(query: string) { return this.contentStorage.searchEvents(query); }
  async searchBlogs(query: string) { return this.contentStorage.searchBlogs(query); }

  async getEvent(id: string) { return this.contentStorage.getEvent(id); }
  async getEventsByArtist(artistId: string) { return this.contentStorage.getEventsByArtist(artistId); }
  async createEvent(event: any) { return this.contentStorage.createEvent(event); }
  async updateEvent(id: string, updates: Partial<any>) { return this.contentStorage.updateEvent(id, updates); }
  async deleteEvent(id: string) { return this.contentStorage.deleteEvent(id); }
  async getUpcomingEvents() { return this.contentStorage.getUpcomingEvents(); }
  async getAllEventsFiltered(filters: any) { return this.contentStorage.getAllEventsFiltered(filters); }

  async getBlog(id: string) { return this.contentStorage.getBlog(id); }
  async getBlogsByArtist(artistId: string) { return this.contentStorage.getBlogsByArtist(artistId); }
  async getAllBlogs() { return this.contentStorage.getAllBlogs(); }
  async createBlog(blog: any) { return this.contentStorage.createBlog(blog); }
  async updateBlog(id: string, updates: Partial<any>) { return this.contentStorage.updateBlog(id, updates); }
  async deleteBlog(id: string) { return this.contentStorage.deleteBlog(id); }

  // Commerce methods - delegate to CommerceStorage
  async getOrder(id: string) { return this.commerceStorage.getOrder(id); }
  async getOrdersByUser(userId: string) { return this.commerceStorage.getOrdersByUser(userId); }
  async createOrder(order: any) { return this.commerceStorage.createOrder(order); }
  async updateOrder(id: string, updates: Partial<any>) { return this.commerceStorage.updateOrder(id, updates); }

  async getSubscription(id: string) { return this.commerceStorage.getSubscription(id); }
  async getSubscriptionsByUser(userId: string) { return this.commerceStorage.getSubscriptionsByUser(userId); }
  async getSubscriptionsByArtist(artistId: string) { return this.commerceStorage.getSubscriptionsByArtist(artistId); }
  async createSubscription(subscription: any) { return this.commerceStorage.createSubscription(subscription); }
  async updateSubscription(id: string, updates: Partial<any>) { return this.commerceStorage.updateSubscription(id, updates); }

  async getPromoCode(id: string) { return this.commerceStorage.getPromoCode(id); }
  async getPromoCodeByCode(code: string) { return this.commerceStorage.getPromoCodeByCode(code); }
  async getAllPromoCodes() { return this.commerceStorage.getAllPromoCodes(); }
  async createPromoCode(promoCode: any) { return this.commerceStorage.createPromoCode(promoCode); }
  async updatePromoCode(id: string, updates: Partial<any>) { return this.commerceStorage.updatePromoCode(id, updates); }
  async deletePromoCode(id: string) { return this.commerceStorage.deletePromoCode(id); }
  async validatePromoCode(code: string, userId: string, orderAmount: number) { return this.commerceStorage.validatePromoCode(code, userId, orderAmount); }

  async getOrderTracking(orderId: string) { return this.commerceStorage.getOrderTracking(orderId); }
  async createOrderTracking(tracking: any) { return this.commerceStorage.createOrderTracking(tracking); }
  async updateOrderTracking(id: string, updates: Partial<any>) { return this.commerceStorage.updateOrderTracking(id, updates); }

  async getReturnRequest(id: string) { return this.commerceStorage.getReturnRequest(id); }
  async getReturnRequestsByUser(userId: string) { return this.commerceStorage.getReturnRequestsByUser(userId); }
  async getReturnRequestsByOrder(orderId: string) { return this.commerceStorage.getReturnRequestsByOrder(orderId); }
  async createReturnRequest(request: any) { return this.commerceStorage.createReturnRequest(request); }
  async updateReturnRequest(id: string, updates: Partial<any>) { return this.commerceStorage.updateReturnRequest(id, updates); }

  // Analytics methods - delegate to AnalyticsStorage
  async logAnalytics(analytics: any) { return this.analyticsStorage.logAnalytics(analytics); }
  async getRecentPlaysByUser(userId: string) { return this.analyticsStorage.getRecentPlaysByUser(userId); }
  async getSongsWithArtistNames(options?: { genre?: string; sort?: string; limit?: number }) { return this.analyticsStorage.getSongsWithArtistNames(options); }
  async getEventsWithArtistNames(filters: any) { return this.analyticsStorage.getEventsWithArtistNames(filters); }
  async getMerchWithArtistNames(filters: any) { return this.analyticsStorage.getMerchWithArtistNames(filters); }

  // Ad methods - delegate to AdStorage
  async getAdCampaign(id: string) { return this.adStorage.getAdCampaign(id); }
  async getAllAdCampaigns() { return this.adStorage.getAllAdCampaigns(); }
  async createAdCampaign(campaign: any) { return this.adStorage.createAdCampaign(campaign); }
  async updateAdCampaign(id: string, updates: Partial<any>) { return this.adStorage.updateAdCampaign(id, updates); }
  async deleteAdCampaign(id: string) { return this.adStorage.deleteAdCampaign(id); }

  async getAudioAd(id: string) { return this.adStorage.getAudioAd(id); }
  async getAudioAdsByCampaign(campaignId: string) { return this.adStorage.getAudioAdsByCampaign(campaignId); }
  async getAllAudioAds() { return this.adStorage.getAllAudioAds(); }
  async createAudioAd(ad: any) { return this.adStorage.createAudioAd(ad); }
  async updateAudioAd(id: string, updates: Partial<any>) { return this.adStorage.updateAudioAd(id, updates); }
  async deleteAudioAd(id: string) { return this.adStorage.deleteAudioAd(id); }

  async getBannerAd(id: string) { return this.adStorage.getBannerAd(id); }
  async getBannerAdsByCampaign(campaignId: string) { return this.adStorage.getBannerAdsByCampaign(campaignId); }
  async getAllBannerAds() { return this.adStorage.getAllBannerAds(); }
  async createBannerAd(ad: any) { return this.adStorage.createBannerAd(ad); }
  async updateBannerAd(id: string, updates: Partial<any>) { return this.adStorage.updateBannerAd(id, updates); }
  async deleteBannerAd(id: string) { return this.adStorage.deleteBannerAd(id); }

  async getAdPlacement(id: string) { return this.adStorage.getAdPlacement(id); }
  async getAdPlacementsByType(type: string) { return this.adStorage.getAdPlacementsByType(type); }
  async createAdPlacement(placement: any) { return this.adStorage.createAdPlacement(placement); }
  async updateAdPlacement(id: string, updates: Partial<any>) { return this.adStorage.updateAdPlacement(id, updates); }
  async deleteAdPlacement(id: string) { return this.adStorage.deleteAdPlacement(id); }

  async createAdImpression(impression: any) { return this.adStorage.createAdImpression(impression); }
  async getAdImpressions(adId: string, adType: string) { return this.adStorage.getAdImpressions(adId, adType); }

  async createAdClick(click: any) { return this.adStorage.createAdClick(click); }
  async getAdClicks(adId: string, adType: string) { return this.adStorage.getAdClicks(adId, adType); }

  async createAdRevenue(revenue: any) { return this.adStorage.createAdRevenue(revenue); }
  async getAdRevenue(adId: string, adType: string) { return this.adStorage.getAdRevenue(adId, adType); }
  async getAdRevenueByArtist(artistId: string) { return this.adStorage.getAdRevenueByArtist(artistId); }

  async getAdStats(adId: string, adType: string) { return this.adStorage.getAdStats(adId, adType); }

  // NFT methods - delegate to NFTStorage
  async getAllNFTs() { return this.nftStorage.getAllNFTs(); }
  async getNFT(id: string) { return this.nftStorage.getNFT(id); }
  async getNFTsByUser(userId: string) { return this.nftStorage.getNFTsByUser(userId); }
  async createNFT(nft: any) { return this.nftStorage.createNFT(nft); }
  async updateNFT(id: string, updates: Partial<any>) { return this.nftStorage.updateNFT(id, updates); }
  async deleteNFT(id: string) { return this.nftStorage.deleteNFT(id); }
  async getListedNFTs() { return this.nftStorage.getListedNFTs(); }
  async getActiveAuctions() { return this.nftStorage.getActiveAuctions(); }
  async createNFTListing(listing: any) { return this.nftStorage.createNFTListing(listing); }
  async updateNFTListing(id: string, updates: Partial<any>) { return this.nftStorage.updateNFTListing(id, updates); }
  async deleteNFTListing(id: string) { return this.nftStorage.deleteNFTListing(id); }
  async createNFTAuction(auction: any) { return this.nftStorage.createNFTAuction(auction); }
  async updateNFTAuction(id: string, updates: Partial<any>) { return this.nftStorage.updateNFTAuction(id, updates); }
  async deleteNFTAuction(id: string) { return this.nftStorage.deleteNFTAuction(id); }
  async createNFTTransaction(transaction: any) { return this.nftStorage.createNFTTransaction(transaction); }
  async getNFTTransactions(nftId: string) { return this.nftStorage.getNFTTransactions(nftId); }
  async getNFTTransactionsByUser(userId: string) { return this.nftStorage.getNFTTransactionsByUser(userId); }
  async getNFTStats() { return this.nftStorage.getNFTStats(); }

  // Fan Club methods - delegate to FanClubStorage
  async getAllFanClubMemberships() { return this.fanClubStorage.getAllFanClubMemberships(); }
  async getFanClubMembershipByUser(userId: string) { return this.fanClubStorage.getFanClubMembershipByUser(userId); }
  async createFanClubMembership(membership: any) { return this.fanClubStorage.createFanClubMembership(membership); }
  async updateFanClubMembership(id: string, updates: any) { return this.fanClubStorage.updateFanClubMembership(id, updates); }
  async getFanClubStats() { return this.fanClubStorage.getFanClubStats(); }

  // Collection methods - delegate to CollectionStorage
  async getAllCollections() { return this.collectionStorage.getAllCollections(); }
  async getCollection(id: string) { return this.collectionStorage.getCollection(id); }
  async createCollection(collection: any) { return this.collectionStorage.createCollection(collection); }

  // DAO methods - delegate to DAOStorage
  async getAllDAOProposals() { return this.daoStorage.getAllDAOProposals(); }
  async getDAOProposal(id: string) { return this.daoStorage.getDAOProposal(id); }
  async createDAOProposal(proposal: any) { return this.daoStorage.createDAOProposal(proposal); }
  async updateDAOProposal(id: string, updates: any) { return this.daoStorage.updateDAOProposal(id, updates); }
  async getDAOVotes(proposalId: string) { return this.daoStorage.getDAOVotes(proposalId); }
  async createDAOVote(vote: any) { return this.daoStorage.createDAOVote(vote); }
  async getUserGovernanceTokens(userId: string) { return this.daoStorage.getUserGovernanceTokens(userId); }
  async createUserGovernanceTokens(tokens: any) { return this.daoStorage.createUserGovernanceTokens(tokens); }
  async updateUserGovernanceTokens(userId: string, updates: any) { return this.daoStorage.updateUserGovernanceTokens(userId, updates); }
  async getDAOStats() { return this.daoStorage.getDAOStats(); }

  // Loyalty methods - delegate to LoyaltyStorage
  async getAllAchievements() { return this.loyaltyStorage.getAllAchievements(); }
  async getAchievement(id: string) { return this.loyaltyStorage.getAchievement(id); }
  async createAchievement(achievement: any) { return this.loyaltyStorage.createAchievement(achievement); }
  async getUserAchievements(userId: string) { return this.loyaltyStorage.getUserAchievements(userId); }
  async createUserAchievement(achievement: any) { return this.loyaltyStorage.createUserAchievement(achievement); }
  async getUserLoyaltyProfile(userId: string) { return this.loyaltyStorage.getUserLoyaltyProfile(userId); }
  async createUserLoyaltyProfile(profile: any) { return this.loyaltyStorage.createUserLoyaltyProfile(profile); }
  async updateUserLoyaltyProfile(id: string, updates: any) { return this.loyaltyStorage.updateUserLoyaltyProfile(id, updates); }
  async getStakingInfo(tokenId: string) { return this.loyaltyStorage.getStakingInfo(tokenId); }
  async createStaking(staking: any) { return this.loyaltyStorage.createStaking(staking); }
  async updateStaking(id: string, updates: any) { return this.loyaltyStorage.updateStaking(id, updates); }
  async createPointsTransaction(transaction: any) { return this.loyaltyStorage.createPointsTransaction(transaction); }
  async getLoyaltyStats() { return this.loyaltyStorage.getLoyaltyStats(); }

  // Helper method
  async getArtistNameByProfileId(artistId: string) { return this.userStorage.getArtistNameByProfileId(artistId); }
}

// Export the main storage instance
export const storage = new MongoStorage();

// Export individual storage classes for testing or advanced usage
export {
  UserStorage,
  ContentStorage,
  CommerceStorage,
  AnalyticsStorage,
  AdStorage,
  NFTStorage,
  FanClubStorage,
  DAOStorage,
  LoyaltyStorage,
  CollectionStorage
};
