import { useState } from "react";
import { BookOpen, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";
import BlogForm from "@/components/forms/blog-form";
import type { Blog } from "./types";

// ---------- COMPONENT ----------
export default function BlogsTab() {
  const auth = useRequireRole("artist");
  const queryClient = useQueryClient();
  const [showCreateBlogModal, setShowCreateBlogModal] = useState(false);
  const [showEditBlogModal, setShowEditBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // ---------- QUERIES ----------
  const { data: artistBlogs, isLoading: blogsLoading } = useQuery({
    queryKey: ["artistBlogs"],
    queryFn: () => fetch("/api/blogs/artist", {
      headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` }
    }).then(res => res.json()),
    enabled: !!auth.user,
  });

  // ---------- MUTATIONS ----------
  const createBlogMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to create blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistBlogs"] });
      toast({
        title: "Blog post published successfully",
        description: "Your blog post is now live for fans to read",
      });
      setShowCreateBlogModal(false);
    },
    onError: () => {
      toast({
        title: "Blog creation failed",
        description: "Failed to create blog post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/blogs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` },
      });
      if (!res.ok) throw new Error("Failed to delete blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistBlogs"] });
      toast({
        title: "Blog post deleted successfully",
        description: "Your blog post has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Blog deletion failed",
        description: "Failed to delete blog post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editBlogMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const res = await fetch(`/api/blogs/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("ruc_auth_token")}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to update blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artistBlogs"] });
      toast({
        title: "Blog post updated successfully",
        description: "Your blog changes have been saved",
      });
      setShowEditBlogModal(false);
      setEditingBlog(null);
    },
    onError: () => {
      toast({
        title: "Blog update failed",
        description: "Failed to update blog post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ---------- SAFE DEFAULTS ----------
  const safeArtistBlogs: Blog[] = Array.isArray(artistBlogs) ? artistBlogs : [];

  return (
    <>
      <TabsContent value="blogs">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">My Blog Posts</h2>
              <p className="text-sm text-muted-foreground">Share insights and connect with your audience</p>
            </div>
            <Button
              className="gradient-primary hover:opacity-90"
              onClick={() => setShowCreateBlogModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Blog Post
            </Button>
          </div>

          {blogsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : safeArtistBlogs.length > 0 ? (
            <div className="space-y-4">
              {safeArtistBlogs.map((blog, index) => (
                <Card key={blog._id} data-testid={`blog-item-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <BookOpen className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg">{blog.title}</h3>
                          {blog.visibility === "SUBSCRIBER_ONLY" && (
                            <Badge variant="secondary" className="text-xs">
                              Subscribers Only
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {blog.content.replace(/[#*>]/g, '').substring(0, 150)}...
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>
                            {new Date(blog.createdAt).toLocaleDateString()}
                          </span>
                          {blog.tags && blog.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              {blog.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingBlog(blog);
                            setShowEditBlogModal(true);
                          }}
                          data-testid={`edit-blog-${index}`}
                        >
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBlogMutation.mutate(blog._id)}
                          disabled={deleteBlogMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No blog posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start sharing your thoughts and insights with your fans.
                </p>
                <Button
                  className="gradient-primary hover:opacity-90"
                  onClick={() => setShowCreateBlogModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Write Your First Post
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* Create Blog Modal */}
      <Dialog open={showCreateBlogModal} onOpenChange={setShowCreateBlogModal}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <BlogForm
              onSubmit={(data) => createBlogMutation.mutate(data)}
              onCancel={() => setShowCreateBlogModal(false)}
              isLoading={createBlogMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Blog Modal */}
      <Dialog open={showEditBlogModal} onOpenChange={setShowEditBlogModal}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <BlogForm
              onSubmit={(data) => editingBlog && editBlogMutation.mutate({ id: editingBlog._id, formData: data })}
              onCancel={() => {
                setShowEditBlogModal(false);
                setEditingBlog(null);
              }}
              isLoading={editBlogMutation.isPending}
              initialData={editingBlog}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
