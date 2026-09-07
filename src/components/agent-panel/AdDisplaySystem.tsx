import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, Timer, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Advertisement {
  id: string;
  name: string;
  ad_type: string;
  content_type: string;
  title: string | null;
  description: string | null;
  media_url: string | null;
  click_url: string | null;
  cta_text: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  min_view_seconds: number | null;
  frequency_type: string | null;
  frequency_limit: number | null;
  priority: number;
  target_teams: string[] | null;
  target_unit_ids: string[] | null;
  target_user_types: string[] | null;
}

interface AdViewState {
  startTime: number;
  completed: boolean;
  clicked: boolean;
}

export function AdDisplaySystem() {
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewState, setViewState] = useState<AdViewState>({ startTime: 0, completed: false, clicked: false });
  const [remainingTime, setRemainingTime] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [viewedAds, setViewedAds] = useState<Set<string>>(new Set());
  const [bannerAds, setBannerAds] = useState<Advertisement[]>([]);

  useEffect(() => {
    if (user && agent) {
      fetchActiveAds();
      loadViewedAdsFromStorage();
    }
  }, [user, agent]);

  const loadViewedAdsFromStorage = () => {
    const today = new Date().toISOString().split('T')[0];
    const storedKey = `viewed_ads_${today}`;
    const stored = localStorage.getItem(storedKey);
    if (stored) {
      setViewedAds(new Set(JSON.parse(stored)));
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('viewed_ads_') && key !== storedKey) {
        localStorage.removeItem(key);
      }
    });
  };

  const saveViewedAd = (adId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const storedKey = `viewed_ads_${today}`;
    const newSet = new Set(viewedAds);
    newSet.add(adId);
    setViewedAds(newSet);
    localStorage.setItem(storedKey, JSON.stringify([...newSet]));
  };

  const isAdTargetedToAgent = (ad: Advertisement): boolean => {
    if (!agent) return false;

    // Check user type targeting
    const userTypes = ad.target_user_types || ['all'];
    if (!userTypes.includes('all')) {
      const agentRole = agent.role || 'agent';
      if (!userTypes.includes(agentRole)) {
        return false;
      }
    }

    // Check team targeting
    const targetTeams = ad.target_teams || [];
    if (targetTeams.length > 0 && agent.team) {
      if (!targetTeams.includes(agent.team)) {
        return false;
      }
    }

    // Check unit targeting
    const targetUnits = ad.target_unit_ids || [];
    if (targetUnits.length > 0 && agent.unit_id) {
      if (!targetUnits.includes(agent.unit_id)) {
        return false;
      }
    }

    return true;
  };

  const fetchActiveAds = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      
      const activeAds = (data || []).filter(ad => {
        const now = new Date();
        const startsAt = ad.starts_at ? new Date(ad.starts_at) : null;
        const expiresAt = ad.expires_at ? new Date(ad.expires_at) : null;
        
        if (startsAt && startsAt > now) return false;
        if (expiresAt && expiresAt < now) return false;
        
        // Apply segmentation filter
        return isAdTargetedToAgent(ad as Advertisement);
      }) as Advertisement[];

      const banners = activeAds.filter(ad => ad.ad_type === 'banner' || ad.ad_type === 'card');
      const popups = activeAds.filter(ad => ad.ad_type === 'popup' || ad.ad_type === 'fullscreen' || ad.ad_type === 'video');

      setBannerAds(banners);
      setAds(popups);

      const unviewedAd = popups.find(ad => !viewedAds.has(ad.id));
      if (unviewedAd) {
        showAd(unviewedAd);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const showAd = (ad: Advertisement) => {
    setCurrentAd(ad);
    setViewState({ startTime: Date.now(), completed: false, clicked: false });
    setRemainingTime(ad.min_view_seconds || 0);
    setIsOpen(true);
  };

  // Countdown timer for mandatory viewing
  useEffect(() => {
    if (!isOpen || !currentAd?.is_mandatory || remainingTime <= 0) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, currentAd, remainingTime]);

  const handleClose = () => {
    if (currentAd?.is_mandatory && remainingTime > 0) {
      return; // Can't close yet
    }
    
    recordAdView();
    setIsOpen(false);
    saveViewedAd(currentAd!.id);
    
    // Show next unviewed ad
    const nextAd = ads.find(ad => !viewedAds.has(ad.id) && ad.id !== currentAd?.id);
    if (nextAd) {
      setTimeout(() => showAd(nextAd), 500);
    }
  };

  const handleClick = () => {
    setViewState(prev => ({ ...prev, clicked: true }));
    
    if (currentAd?.click_url) {
      window.open(currentAd.click_url, '_blank');
    }
    
    recordAdView(true);
    handleClose();
  };

  const recordAdView = async (clicked = false) => {
    if (!currentAd || !user) return;
    
    const viewDuration = Math.floor((Date.now() - viewState.startTime) / 1000);
    
    try {
      await supabase.from('ad_views').insert({
        ad_id: currentAd.id,
        agent_id: user.id,
        view_duration_seconds: viewDuration,
        clicked: clicked || viewState.clicked,
        completed: remainingTime <= 0 || viewDuration >= (currentAd.min_view_seconds || 0),
        device_info: {
          userAgent: navigator.userAgent,
          screen: `${window.screen.width}x${window.screen.height}`,
        },
      });
    } catch (error) {
      console.error('Error recording ad view:', error);
    }
  };

  const canClose = !currentAd?.is_mandatory || remainingTime <= 0;

  return (
    <>
      {/* Banner Ads */}
      {bannerAds.length > 0 && (
        <div className="space-y-3 mb-4">
          {bannerAds.slice(0, 2).map(ad => (
            <BannerAd key={ad.id} ad={ad} userId={user?.id} />
          ))}
        </div>
      )}

      {/* Popup/Fullscreen Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && canClose && handleClose()}>
        <DialogContent 
          className={cn(
            "p-0 overflow-hidden bg-slate-900 border-slate-700",
            currentAd?.ad_type === 'fullscreen' && "max-w-4xl h-[90vh]",
            currentAd?.ad_type === 'video' && "max-w-3xl"
          )}
        >
          {/* Header with timer and close */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
            <Badge variant="outline" className="border-purple-500/50 text-purple-300 bg-black/50">
              Patrocinado
            </Badge>
            
            <div className="flex items-center gap-2">
              {currentAd?.is_mandatory && remainingTime > 0 && (
                <Badge className="bg-amber-500/80 text-black flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {remainingTime}s
                </Badge>
              )}
              
              {currentAd?.content_type === 'video' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 text-white hover:bg-white/20",
                  !canClose && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleClose}
                disabled={!canClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Ad Content */}
          <div className="relative flex flex-col h-full">
            {currentAd?.content_type === 'video' && currentAd.media_url ? (
              <video
                src={currentAd.media_url}
                className="w-full h-auto max-h-[70vh] object-contain bg-black"
                autoPlay
                muted={isMuted}
                loop={!currentAd.is_mandatory}
                playsInline
              />
            ) : currentAd?.media_url ? (
              <img
                src={currentAd.media_url}
                alt={currentAd.title || 'Advertisement'}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gradient-to-br from-purple-900/50 to-slate-900">
                <div className="text-center p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{currentAd?.title}</h3>
                  <p className="text-muted-foreground">{currentAd?.description}</p>
                </div>
              </div>
            )}

            {/* CTA Section */}
            {(currentAd?.title || currentAd?.cta_text) && (
              <div className="p-4 bg-slate-800/90 border-t border-slate-700">
                {currentAd.title && !currentAd.media_url && (
                  <h4 className="font-semibold text-lg text-white mb-1">{currentAd.title}</h4>
                )}
                {currentAd.description && currentAd.media_url && (
                  <p className="text-sm text-muted-foreground mb-3">{currentAd.description}</p>
                )}
                {currentAd.cta_text && currentAd.click_url && (
                  <Button 
                    onClick={handleClick}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {currentAd.cta_text}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Banner Component
function BannerAd({ ad, userId }: { ad: Advertisement; userId?: string }) {
  const [startTime] = useState(Date.now());

  const handleClick = async () => {
    // Record view with click
    if (userId) {
      const viewDuration = Math.floor((Date.now() - startTime) / 1000);
      try {
        await supabase.from('ad_views').insert({
          ad_id: ad.id,
          agent_id: userId,
          view_duration_seconds: viewDuration,
          clicked: true,
          completed: true,
          device_info: {
            userAgent: navigator.userAgent,
          },
        });
      } catch (error) {
        console.error('Error recording banner click:', error);
      }
    }

    if (ad.click_url) {
      window.open(ad.click_url, '_blank');
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden rounded-xl cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg",
        "bg-gradient-to-r from-purple-900/30 to-slate-800/50 border border-purple-500/20"
      )}
    >
      {ad.media_url ? (
        <img 
          src={ad.media_url} 
          alt={ad.title || 'Banner'} 
          className="w-full h-24 object-cover"
        />
      ) : (
        <div className="p-4 flex items-center justify-between">
          <div className="flex-1">
            <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300 mb-1">
              Patrocinado
            </Badge>
            {ad.title && <h4 className="font-semibold text-white">{ad.title}</h4>}
            {ad.description && <p className="text-xs text-muted-foreground line-clamp-1">{ad.description}</p>}
          </div>
          {ad.cta_text && (
            <Button size="sm" variant="secondary" className="ml-4">
              {ad.cta_text}
            </Button>
          )}
        </div>
      )}
      {ad.media_url && ad.title && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
          <div>
            <Badge variant="outline" className="text-[8px] border-purple-500/50 text-purple-300 mb-1">
              Patrocinado
            </Badge>
            <p className="text-sm font-semibold text-white">{ad.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdDisplaySystem;
