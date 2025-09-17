import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, FlatList, Platform, Linking, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  WordDetail: { word: DailyWord; sourceScreen?: string };
  LearnMore: { url: string; title: string };
  NewsDetail: { id: string | number; title: string; sourceScreen?: string };
  'Daily Words': undefined;
  News: undefined;
};
import useAppUpdate from '../../../hooks/useAppUpdate';
import { apiService, SocialMediaData } from '../../../services/apiService';
import { storageService } from '../../../services/storageService';
import { colors } from '../../../theme/colors';

interface DailyWord {
  notification_id: number;
  daily_word: string;
  content: string;
  link: string;
  date: string;
  full_date: string;
  created_at: string;
}

interface Post {
  post_id: string | number;
  post_title: string;
  post_content: string;
  post_date: string;
  featured_image?: string;
  pdf_file?: string;
}

interface Category {
  category_id: string | number;
  category_name: string;
  posts: Post[];
}

interface NotificationResponse {
  status: string;
  errormsg: string;
  error_code: string;
  daily_word: DailyWord;
}

// Function to calculate responsive font size for daily word
const getResponsiveFontSize = (text: string): number => {
  const screenWidth = Dimensions.get('window').width;
  const availableWidth = screenWidth - 80; // Account for padding and margins
  const textLength = text.length;
  
  // Base font size
  let fontSize = 32;
  
  // Adjust font size based on text length and screen width
  if (textLength > 15) {
    fontSize = Math.max(20, Math.min(32, availableWidth / (textLength * 0.6)));
  } else if (textLength > 10) {
    fontSize = Math.max(24, Math.min(32, availableWidth / (textLength * 0.7)));
  } else {
    fontSize = Math.min(32, availableWidth / (textLength * 0.8));
  }
  
  return Math.floor(fontSize);
};

const HomeScreen = () => {
  // Navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // Get the checkForUpdates function from the useAppUpdate hook
  const { checkForUpdates } = useAppUpdate(false, 30 * 60 * 1000);
  
  // State for notification data
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [wordList, setWordList] = useState<DailyWord[]>([]);
  const [postsList, setPostsList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webViewHeight, setWebViewHeight] = useState(150); // Dynamic height for WebView
  const [socialMediaData, setSocialMediaData] = useState<SocialMediaData | null>(null);

  // Refs
  const isCheckingRef = useRef(false);
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState(false);
  
  // Debug function to manually test posts loading
  const testPostsLoading = async () => {
    console.log('=== TESTING POSTS LOADING ===');
    try {
      // Test storage first
      const storedPosts = await storageService.get('posts');
      console.log('Stored posts:', storedPosts);
      
      // Test API call
      const apiPosts = await apiService.fetchAndStorePosts();
      console.log('API posts:', apiPosts);
      
      // Test setting state
      if (apiPosts) {
        setPostsList(apiPosts);
        console.log('Posts set to state');
      }
    } catch (error) {
      console.error('Test posts loading error:', error);
    }
    console.log('=== END POSTS LOADING TEST ===');
  };

  // Add a useEffect to run the test after component mounts
  useEffect(() => {
    // Run test after a delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      testPostsLoading();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Navigate to word detail
  const navigateToWordDetail = (word: DailyWord) => {
    navigation.navigate('WordDetail', { word, sourceScreen: 'Home' });
  };

  // Navigate to news post detail
  const navigateToNewsPost = (post: Post) => {
    navigation.navigate('NewsDetail', { 
      id: post.post_id,
      title: post.post_title,
      sourceScreen: 'Home'
    });
  };

  // Get the most recent post from all categories
  const getMostRecentPost = (): Post | null => {
    console.log('getMostRecentPost called, postsList:', postsList);
    console.log('postsList type:', typeof postsList);
    console.log('postsList is array:', Array.isArray(postsList));

    if (!postsList || postsList.length === 0) {
      console.log('No posts available - empty or null postsList');
      return null;
    }

    let mostRecentPost: Post | null = null;
    let highestPostId = -1;

    postsList.forEach((category, categoryIndex) => {
      console.log(`Processing category ${categoryIndex}: ${category.category_name} with ${category.posts?.length || 0} posts`);

      if (!category.posts || !Array.isArray(category.posts)) {
        console.log(`Category ${category.category_name} has no posts or posts is not an array`);
        return;
      }

      category.posts.forEach((post, postIndex) => {
        const postId = parseInt(post.post_id as string, 10);
        console.log(`Post ${postIndex}: ${post.post_title}, Post ID: ${post.post_id}`);

        if (isNaN(postId)) {
          console.log(`Invalid post ID for post: ${post.post_title}`);
          return;
        }

        if (postId > highestPostId) {
          highestPostId = postId;
          mostRecentPost = post;
          console.log('New most recent post found based on post_id:', post.post_title, 'Post ID:', postId);
        }
      });
    });

    console.log('Final most recent post based on post_id:', mostRecentPost ? (mostRecentPost as Post).post_title : 'none');
    console.log('Final highestPostId:', highestPostId);
    return mostRecentPost;
  };

  // Helper function to strip HTML tags and truncate content
  const stripHtmlAndTruncate = (html: string, maxLength: number = 100): string => {
    if (!html) return '';
    
    // Strip HTML tags using regex
    const text = html.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities
    const decodedText = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Truncate and add ellipsis
    if (decodedText.length <= maxLength) return decodedText.trim();
    return decodedText.substring(0, maxLength).trim() + '...';
  };

  // Fetch notifications and store them in local storage
  const fetchAndStoreNotifications = async () => {
    try {
      console.log('Fetching notifications...');
      const response = await apiService.fetchAndStoreNotifications(1, 100, false);
      const newNotifications = response?.data || [];
      console.log('Fetched notifications:', newNotifications);
      if (newNotifications && newNotifications.length > 0) {
        setWordList(newNotifications);
      }
      return newNotifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Try to load from storage if API fails
      const storedNotifications = await storageService.get('notifications');
      if (storedNotifications) {
        console.log('Using stored notifications');
        setWordList(storedNotifications);
        return storedNotifications;
      }
      return [];
    }
  };

  // Fetch posts and store them in local storage
  const fetchAndStorePosts = async () => {
    try {
      console.log('Fetching posts...');
      const newPosts = await apiService.fetchAndStorePosts();
      console.log('Fetched posts:', newPosts);
      if (newPosts && newPosts.length > 0) {
        setPostsList(newPosts);
        console.log('Posts set to state:', newPosts);
      } else {
        console.log('No posts received from API');
      }
      return newPosts || [];
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Try to load from storage if API fails
      const storedPosts = await storageService.get('posts');
      if (storedPosts) {
        console.log('Using stored posts:', storedPosts);
        setPostsList(storedPosts);
        return storedPosts;
      }
      console.log('No stored posts available');
      return [];
    }
  };

  // Fetch social media data
  const fetchSocialMediaData = async () => {
    try {
      const socialData = await apiService.fetchSocialMedia();
      setSocialMediaData(socialData);
      console.log('Social media data fetched:', socialData);
    } catch (error) {
      console.error('Error fetching social media data:', error);
      // Set default values if API fails
      setSocialMediaData({
        facebook: 'https://www.facebook.com/profile.php?id=100087341866606',
        donate_link: 'https://www.paypal.com/donate/?hosted_button_id=FKJZX24327HPG',
        instagram: 'https://www.instagram.com/miin.ojibwe/',
        tiktok: 'https://www.tiktok.com/@miinojibwe'
      });
    }
  };

  // Fetch latest notification
  const fetchLatestNotification = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Clear any previous errors
      setError(null);

      // Fetch latest notification and notifications list in parallel, but don't let one failure block others
      const results = await Promise.allSettled([
        apiService.getData('latest-notification'),
        fetchAndStoreNotifications(),
        fetchAndStorePosts(),
        fetchSocialMediaData()
      ]);

      const notificationSettled = results[0];
      const notificationsSettled = results[1];
      // We don't need the values here, these functions already set state internally

      let notificationResponse: any = null;
      let notifications: any[] = [];

      if (notificationSettled.status === 'fulfilled') {
        notificationResponse = notificationSettled.value;
      } else {
        console.warn('latest-notification request failed:', notificationSettled.reason);
      }

      if (notificationsSettled.status === 'fulfilled') {
        notifications = notificationsSettled.value || [];
      } else {
        console.warn('notifications request failed:', notificationsSettled.reason);
        // Try to recover from storage so Recent Words still show
        const storedNotifications = await storageService.get('notifications');
        if (storedNotifications && Array.isArray(storedNotifications)) {
          notifications = storedNotifications;
          setWordList(storedNotifications);
        }
      }

      console.log('Latest notification response:', notificationResponse);

      // Try to get the daily word from whichever source is available
      let dailyWordData = null as any;
      if (notificationResponse?.status === 'success') {
        dailyWordData = notificationResponse.daily_word || notificationResponse;
      } else if (notificationResponse?.daily_word) {
        dailyWordData = notificationResponse.daily_word;
      } else if (Array.isArray(notificationResponse) && notificationResponse.length > 0) {
        dailyWordData = notificationResponse[0];
      } else if (notifications && notifications.length > 0) {
        // Fall back to first notification if latest-notification unavailable
        dailyWordData = notifications[0];
      }

      if (dailyWordData) {
        console.log('Setting daily word:', dailyWordData);
        setDailyWord(dailyWordData);
        setWebViewHeight(150); // Reset height for new content
        setError(null); // Clear any previous errors on successful load
      } else {
        console.log('No daily word available in any format');
        setDailyWord(null);
      }
    } catch (error) {
      console.error('Error fetching latest notification:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Error loading data';
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          errorMessage = 'Network connection issue. Please check your internet connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'App permissions required. Please restart the app.';
        }
      }
      
      // Only set error if this is not a retry attempt (to avoid overwriting retry logic)
      if (!isRefreshing) {
        throw error; // Re-throw for retry logic to handle
      } else {
        setError(errorMessage);
      }
      setDailyWord(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!isCheckingRef.current) {
      isCheckingRef.current = true;
      console.log('Initial data fetch started');
      
      const init = async () => {
        try {
          // First, immediately load any cached data to show something quickly
          try {
            const [cachedNotifications, cachedPosts] = await Promise.all([
              storageService.get('notifications'),
              storageService.get('posts')
            ]);
            
            if (cachedNotifications && cachedNotifications.length > 0) {
              console.log('Loading cached notifications immediately:', cachedNotifications.length);
              setWordList(cachedNotifications);
              setDailyWord(cachedNotifications[0]);
            }
            
            if (cachedPosts && cachedPosts.length > 0) {
              console.log('Loading cached posts immediately:', cachedPosts.length);
              setPostsList(cachedPosts);
            }
          } catch (storageError) {
            console.warn('Failed to load initial cached data:', storageError);
          }
          
          // Add a grace period to ensure app is fully initialized
          // This helps when permission dialogs delay app readiness
          console.log('Waiting for app initialization grace period...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          await checkForUpdates();
          
          // Retry logic for initial data fetch
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              console.log(`Attempting data fetch (attempt ${retryCount + 1}/${maxRetries})`);
              await fetchLatestNotification();
              console.log('Initial data fetch completed successfully');
              break; // Success, exit retry loop
            } catch (fetchError) {
              retryCount++;
              console.warn(`Data fetch attempt ${retryCount} failed:`, fetchError);
              
              if (retryCount < maxRetries) {
                // Wait before retry (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                console.error('All data fetch attempts failed');
                setError('Unable to load data. Please pull down to refresh.');
              }
            }
          }
          
          // Also load any cached posts from storage
          try {
            const cachedPosts = await storageService.get('posts');
            if (cachedPosts && cachedPosts.length > 0) {
              console.log('Loading cached posts:', cachedPosts);
              setPostsList(cachedPosts);
            } else {
              console.log('No cached posts found, attempting to fetch fresh posts');
              // Try to fetch posts even if notifications succeeded
              try {
                await fetchAndStorePosts();
              } catch (postsError) {
                console.warn('Failed to fetch posts during init:', postsError);
              }
            }
          } catch (storageError) {
            console.warn('Failed to load cached posts:', storageError);
          }
          
          setHasCheckedOnMount(true);
        } catch (error) {
          console.error('Error during initial app setup:', error);
          setError('App initialization failed. Please restart the app.');
          setLoading(false);
          setRefreshing(false);
        }
      };
      
      init();
    }
  }, []);

  // Debug effect to monitor postsList changes
  useEffect(() => {
    console.log('postsList changed:', postsList);
    console.log('postsList length:', postsList?.length || 0);
    if (postsList && postsList.length > 0) {
      console.log('First category:', postsList[0]);
      console.log('Total posts across all categories:', 
        postsList.reduce((total, cat) => total + cat.posts.length, 0)
      );
    }
  }, [postsList]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    console.log('Manual refresh triggered, fetching both notifications and posts');
    fetchLatestNotification(true);
  };

  // Format date as MM-DD-YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      // If date is already in DD-MM-YYYY format, convert it to MM-DD-YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('-');
        return `${month}-${day}-${year}`;
      }
      
      // For other formats, try to parse as Date
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      
      // Format as MM-DD-YYYY
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${day}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original if error
    }
  };

  // Helper function to format post date
  const formatPostDate = (dateString: string): string => {
    if (!dateString) return '';
    
    console.log('HomeScreen - Original date string:', dateString);
    
    try {
      // Check if the date is in DD-MM-YYYY format
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('-');
        console.log('HomeScreen - Split date parts:', { day, month, year });
        
        // Create date using Date constructor (year, month-1, day)
        // Note: month is 0-indexed in JavaScript Date constructor
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        console.log('HomeScreen - Parsed DD-MM-YYYY date:', date);
        
        if (!isNaN(date.getTime())) {
          const formatted = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          console.log('HomeScreen - Formatted date:', formatted);
          return formatted;
        }
      }
      
      // Try to parse as is for other formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If parsing fails, return the original string
        console.warn('HomeScreen - Invalid date format:', dateString);
        return dateString;
      }
      
      // Format as a readable date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('HomeScreen - Error formatting post date:', error);
      return dateString; // Return original if error
    }
  };

  // HTML template with basic styling
  const getHtmlTemplate = (content: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #2c3e50;
            padding: 0;
            margin: 0;
          }
          a {
            color: #007AFF;
            text-decoration: none;
          }
          .container {
            padding: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${content}
        </div>
      </body>
      </html>
    `;
  };

  // Handle navigation to external links
  const onShouldStartLoadWithRequest = (event: any) => {
    if (event.url !== 'about:blank') {
      Linking.openURL(event.url);
      return false;
    }
    return true;
  };

  // Render word list item
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {/* Daily Word Card */}
            <View style={styles.card}>
              {dailyWord ? (
                <View style={styles.notificationContainer}>
                  <Text style={styles.wordOfTheDayLabel}>WORD OF THE DAY</Text>
                  <Text style={[styles.dailyWordText, { fontSize: getResponsiveFontSize(dailyWord.daily_word) }]}>{dailyWord.daily_word}</Text>
                  <Text style={styles.wordContent}>{dailyWord.content}</Text>
                  {dailyWord.link && (
                    <TouchableOpacity 
                      style={styles.learnMoreButton}
                      onPress={() => navigation.navigate('LearnMore', { 
                        url: dailyWord.link, 
                        title: dailyWord.daily_word 
                      })}
                    >
                      <Text style={styles.learnMoreButtonText}>OPD</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.noNotificationText}>
                  No daily word available
                </Text>
              )}
            </View>

            {/* Recent Words Section */}
            <View style={styles.recentWordsContainer}>
              <View style={styles.recentWordsHeader}>
                <Text style={styles.recentWordsTitle}>Recent Words</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Daily Words')}>
                  <Text style={styles.viewAllLink}>View All</Text>
                </TouchableOpacity>
              </View>
              {wordList.length > 0 ? (
                <ScrollView 
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentWordsBubbles}
                >
                  {wordList.slice(0, 10).map((word, index) => (
                    <TouchableOpacity
                      key={word.notification_id?.toString() || `word-${index}`}
                      style={styles.wordBubble}
                      onPress={() => navigateToWordDetail(word)}
                    >
                      <Text style={styles.wordBubbleText} numberOfLines={1}>
                        {word.daily_word || 'Untitled'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noWordsText}>No recent words available</Text>
              )}
            </View>

            {/* News & Announcements Section */}
            <View style={styles.newsContainer}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsTitle}>News & Announcements</Text>
                <TouchableOpacity onPress={() => navigation.navigate('News')}>
                  <Text style={styles.viewAllLink}>View Archive</Text>
                </TouchableOpacity>
              </View>
              
              {(() => {
                console.log('Rendering news section, postsList length:', postsList.length);
                const mostRecentPost = getMostRecentPost();
                console.log('Most recent post found:', mostRecentPost);
                return mostRecentPost ? (
                  <TouchableOpacity 
                    style={styles.newsCard}
                    onPress={() => navigateToNewsPost(mostRecentPost as Post)}
                  >
                    <Text style={styles.newsPostTitle}>{mostRecentPost.post_title}</Text>
                    <Text style={styles.newsPostContent}>
                      {stripHtmlAndTruncate(mostRecentPost.post_content, 120)}
                    </Text>
                    <Text style={styles.newsPostDate}>
                      {formatPostDate(mostRecentPost.post_date)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <Text style={styles.noNewsText}>No announcements available</Text>
                    <Text style={styles.noNewsText}>Posts in state: {postsList.length}</Text>
                  </View>
                );
              })()}
            </View>

            {/* Support the Language Section */}
            <View style={styles.supportContainer}>
              <Text style={styles.supportIcon}>♥</Text>
              <Text style={styles.supportTitle}>Support the Language</Text>
              <Text style={styles.supportDescription}>
                Help preserve Ojibwe language for future generations
              </Text>
              <TouchableOpacity 
                style={styles.donateButton}
                onPress={() => Linking.openURL(socialMediaData?.donate_link || 'https://www.paypal.com/donate/?hosted_button_id=FKJZX24327HPG')}
              >
                <Text style={styles.donateButtonText}>Donate Now</Text>
              </TouchableOpacity>
            </View>

            {/* Follow Us Section */}
            <View style={styles.followContainer}>
              <Text style={styles.followTitle}>Follow Us</Text>
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.socialButton, styles.facebookButton]}
                  onPress={() => Linking.openURL(socialMediaData?.facebook || 'https://www.facebook.com/profile.php?id=100087341866606')}
                >
                  <Text style={styles.socialButtonText}>f</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButton, styles.instagramButton]}
                  onPress={() => Linking.openURL(socialMediaData?.instagram || 'https://www.instagram.com/miin.ojibwe/')}
                >
                  <Text style={styles.socialButtonText}>i</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButton, styles.tiktokButton]}
                  onPress={() => Linking.openURL(socialMediaData?.tiktok || 'https://www.tiktok.com/@miinojibwe')}
                >
                  <Text style={styles.socialButtonText}>t</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#E9F0FD',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  dailyWordContainer: {
    marginBottom: 16,
  },
  dailyWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dailyWordDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  webViewContainer: {
    minHeight: 100,
  },
  webView: {
    flex: 1,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  notificationContainer: {
    marginTop: 8,
  },
  dailyWordText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Montserrat-Bold' : 'Montserrat-Bold',
    marginBottom: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  notificationDate: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  contentBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
    // Height will be controlled dynamically via state
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
  },
  noNotificationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  noWordsText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginVertical: 16,
  },
  wordOfTheDayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  wordContent: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  learnMoreButton: {
    backgroundColor: '#B565A7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
  },
  learnMoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recentWordsContainer: {
    backgroundColor: '#E9F0FD',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  recentWordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentWordsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  viewAllLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  recentWordsBubbles: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  wordBubble: {
    backgroundColor: '#B565A7',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 80,
  },
  wordBubbleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  newsContainer: {
    backgroundColor: '#E9F0FD',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  newsPostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 22,
  },
  newsPostContent: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
    marginBottom: 8,
  },
  newsPostDate: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  noNewsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  supportContainer: {
    backgroundColor: '#4A3C8C',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  supportIcon: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 16,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  supportDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  donateButton: {
    backgroundColor: '#B565A7',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followContainer: {
    backgroundColor: '#E9F0FD',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  followTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 24,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  instagramButton: {
    backgroundColor: '#E4405F',
  },
  tiktokButton: {
    backgroundColor: '#FF0050',
  },
  socialButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
