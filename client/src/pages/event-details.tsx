
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Calendar, MapPin, Clock, Users, Star, Share2, Heart, Ticket, ChevronLeft, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";

export default function EventDetails() {
  const [location, navigate] = useLocation();
  const eventId = location.split('/')[2];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: event, isLoading } = useQuery({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error("Failed to fetch event");
      return response.json();
    },
    enabled: !!eventId,
  });

  const { data: artist } = useQuery({
    queryKey: ["/api/artists", event?.artistId],
    queryFn: async () => {
      const response = await fetch(`/api/artists/${event.artistId}`);
      if (!response.ok) throw new Error("Failed to fetch artist");
      return response.json();
    },
    enabled: !!event?.artistId,
  });

  const { data: reviews } = useQuery({
    queryKey: ["/api/events", eventId, "reviews"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/reviews`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!eventId,
  });

  const buyTicketMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ 
          type: 'event',
          id: eventId,
          quantity: ticketQuantity
        })
      });
      if (!response.ok) throw new Error("Failed to add to cart");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to cart",
        description: `${ticketQuantity} ticket(s) added to your cart`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      navigate("/cart");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add tickets to cart",
        variant: "destructive"
      });
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify({ 
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (!response.ok) throw new Error("Failed to submit review");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "reviews"] });
      setShowReviewModal(false);
      setReviewComment("");
      setReviewRating(5);
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to toggle favorite");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.favorited ? "Added to favorites" : "Removed from favorites",
        description: data.favorited ? "Event saved to your favorites" : "Event removed from favorites"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading size="lg" text="Loading event details..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-16 pb-24">
        <div className="container-custom py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Event not found</h3>
              <p className="text-muted-foreground">The event you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEventPast = new Date(event.date) < new Date();
  const eventDate = new Date(event.date);
  const averageRating = reviews?.length > 0 ? reviews.reduce((acc: number, review: any) => acc + review.rating, 0) / reviews.length : 0;

  const handleBuyTicket = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to buy tickets",
        variant: "destructive"
      });
      return;
    }
    buyTicketMutation.mutate();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Check out "${event.title}" on Rise Up Creators`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Event link copied to clipboard"
      });
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-custom py-8 max-w-6xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/events")}
          className="mb-6 hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Header */}
            <div>
              <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
                <img
                  src={event.imageUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400"}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <Badge 
                  className={`absolute top-4 right-4 ${
                    isEventPast ? 'bg-muted text-muted-foreground' : 'bg-primary text-white'
                  }`}
                >
                  {isEventPast ? 'PAST EVENT' : event.onlineUrl ? 'ONLINE' : 'LIVE'}
                </Badge>

                {/* Event Actions */}
                <div className="absolute top-4 left-4 flex space-x-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => toggleFavoriteMutation.mutate()}
                    disabled={!user}
                    className="bg-black/50 backdrop-blur-sm hover:bg-black/70"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleShare}
                    className="bg-black/50 backdrop-blur-sm hover:bg-black/70"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
                {averageRating > 0 && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviews?.length} reviews)</span>
                  </div>
                )}
              </div>

              {artist && (
                <p className="text-lg text-muted-foreground mb-4">
                  by <span className="text-primary font-semibold cursor-pointer hover:underline"
                         onClick={() => navigate(`/artist/${artist._id}`)}>{artist.name}</span>
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="w-5 h-5 mr-3" />
                  <span>{eventDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="w-5 h-5 mr-3" />
                  <span>{eventDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="w-5 h-5 mr-3" />
                  <span>{event.location}</span>
                </div>
                {event.capacity && (
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-5 h-5 mr-3" />
                    <span>{event.attendees?.length || 0} / {event.capacity} attending</span>
                  </div>
                )}
              </div>
            </div>

            {/* Event Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </CardContent>
            </Card>

            {/* Artist Info */}
            {artist && (
              <Card>
                <CardHeader>
                  <CardTitle>About the Artist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-4">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${artist.email}`}
                      alt={artist.name}
                      className="w-16 h-16 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{artist.name}</h3>
                      <p className="text-muted-foreground mb-4">{artist.bio || "No bio available"}</p>
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/artist/${artist._id}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Reviews ({reviews?.length || 0})</CardTitle>
                {user && !isEventPast && (
                  <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Write Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Write a Review</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Rating</Label>
                          <div className="flex space-x-1 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setReviewRating(star)}
                                className="focus:outline-none"
                              >
                                <Star 
                                  className={`w-6 h-6 ${
                                    star <= reviewRating 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="review-comment">Comment</Label>
                          <Textarea
                            id="review-comment"
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Share your experience..."
                            className="mt-2"
                          />
                        </div>
                        <Button 
                          onClick={() => submitReviewMutation.mutate()}
                          disabled={submitReviewMutation.isPending || !reviewComment.trim()}
                          className="w-full"
                        >
                          Submit Review
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any, index: number) => (
                      <div key={index} className="border-b border-border pb-4 last:border-b-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No reviews yet. Be the first to review this event!</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Purchase */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="w-5 h-5 mr-2" />
                  Get Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">₹{event.ticketPrice}</div>
                    <div className="text-sm text-muted-foreground">per ticket</div>
                  </div>

                  {!isEventPast && (
                    <>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                            disabled={ticketQuantity <= 1}
                          >
                            -
                          </Button>
                          <Input
                            id="quantity"
                            type="number"
                            value={ticketQuantity}
                            onChange={(e) => setTicketQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="text-center"
                            min="1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setTicketQuantity(ticketQuantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center font-semibold">
                        <span>Total:</span>
                        <span className="text-primary">₹{event.ticketPrice * ticketQuantity}</span>
                      </div>

                      <Button
                        onClick={handleBuyTicket}
                        disabled={buyTicketMutation.isPending}
                        className="w-full bg-primary hover:bg-primary/80 text-white"
                      >
                        {buyTicketMutation.isPending ? <Loading size="sm" /> : "Add to Cart"}
                      </Button>

                      {event.onlineUrl && (
                        <p className="text-xs text-muted-foreground text-center">
                          This is an online event. You'll receive a link after purchase.
                        </p>
                      )}
                    </>
                  )}

                  {isEventPast && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">This event has already ended.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Event Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendees</span>
                    <span className="font-semibold">{event.attendees?.length || 0}</span>
                  </div>
                  {event.capacity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-semibold">{event.capacity}</span>
                    </div>
                  )}
                  {averageRating > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
