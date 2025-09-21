IMPORTANT! The following was AI generated using Perplexity and may be incorrect.

# Firecrawl Authentication for Login-Protected Websites: Complete Guide

Based on my research of official documentation, GitHub issues, and community resources, here's a comprehensive guide on how to authenticate with Firecrawl when scraping websites that require login.

## Overview of Firecrawl Authentication Methods

Firecrawl supports authentication for login-protected content through **cookie-based authentication** using HTTP headers[1][2]. Currently, Firecrawl does not support direct username/password authentication, but provides workarounds to access protected content by passing session cookies obtained from authenticated browser sessions.

## Method 1: Cookie Header Authentication (Recommended)

The most reliable method for accessing login-protected content with Firecrawl involves extracting cookies from an authenticated browser session and passing them via headers.

### Step-by-Step Process

**Step 1: Manual Login and Cookie Extraction**

1. Log into the target website using your regular browser
2. Open Developer Tools (F12) and navigate to the Network tab
3. Refresh the page to capture network requests
4. Click on the first request in the list
5. In the Headers tab, scroll to Request Headers and copy the `Cookie` header value[2]

**Step 2: Using Cookies with Firecrawl API**

### cURL Example

For the v1 API:
```bash
curl -X POST https://api.firecrawl.dev/v1/scrape \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer fc-YOUR-API-KEY' \
  -d '{
    "url": "https://example-protected-site.com",
    "headers": {
      "Cookie": "session_id=abc123; auth_token=xyz789; user_pref=value"
    }
  }'
```

For crawling operations:
```bash
curl -X POST https://api.firecrawl.dev/v1/crawl \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer fc-YOUR-API-KEY' \
  -d '{
    "url": "https://example-protected-site.com",
    "scrapeOptions": {
      "headers": {
        "Cookie": "session_id=abc123; auth_token=xyz789"
      }
    }
  }'
```

### Python SDK Implementation

Using the Firecrawl Python SDK with headers support:

```python
from firecrawl import Firecrawl

# Initialize Firecrawl client
app = Firecrawl(api_key="fc-YOUR-API-KEY")

# Scrape with authentication cookies
scrape_result = app.scrape(
    'https://protected-site.com/dashboard',
    formats=['markdown', 'html'],
    headers={
        'Cookie': 'session_id=abc123; auth_token=xyz789; csrf_token=def456',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
)

print(scrape_result)
```

For crawling with authentication:
```python
# Crawl with authentication
crawl_result = app.crawl(
    'https://protected-site.com',
    limit=50,
    scrape_options={
        'formats': ['markdown'],
        'headers': {
            'Cookie': 'session_id=abc123; auth_token=xyz789'
        }
    }
)
```

## Method 2: Using Firecrawl Actions for Login Automation

Firecrawl's Actions feature allows you to automate the login process by simulating user interactions with forms and elements[3].

### Login Form Automation Example

```python
from firecrawl import Firecrawl

app = Firecrawl(api_key="fc-YOUR-API-KEY")

# Automate login process using actions
doc = app.scrape('https://example.com/login', {
    'formats': ['markdown'],
    'actions': [
        {'type': 'wait', 'milliseconds': 2000},
        {'type': 'click', 'selector': 'input[name="username"]'},
        {'type': 'write', 'text': 'your-username'},
        {'type': 'click', 'selector': 'input[name="password"]'},
        {'type': 'write', 'text': 'your-password'},
        {'type': 'click', 'selector': 'button[type="submit"]'},
        {'type': 'wait', 'milliseconds': 3000},
        {'type': 'scrape'}
    ]
})

print(doc['markdown'])
```

## Method 3: Advanced Header Configuration

For more complex authentication scenarios, you can include additional headers beyond cookies:

```python
# Comprehensive header configuration
headers = {
    'Cookie': 'sessionid=xyz123; csrftoken=abc456; user_preference=value',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://website.com/login',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}

scrape_result = app.scrape(
    'https://protected-content.com/data',
    formats=['markdown', 'json'],
    headers=headers,
    only_main_content=True
)
```

## API Version Differences

### V1 API Structure
```json
{
  "url": "https://example.com",
  "headers": {
    "Cookie": "session=value"
  }
}
```

### V2 API Structure  
```json
{
  "url": "https://example.com",
  "scrapeOptions": {
    "headers": {
      "Cookie": "session=value"  
    }
  }
}
```

## Best Practices and Important Considerations

### Cookie Management
- **Cookie Expiration**: Session cookies expire over time and need to be refreshed[4]
- **Essential Cookies Only**: For platforms like Facebook, often only `c_user` and `xs` cookies are required[4]
- **Cookie Testing**: Use testing endpoints like `https://postman-echo.com/cookies` to verify cookie formatting[4]

### Security and Compliance
- **Store Cookies Securely**: Never commit authentication cookies to version control
- **Respect Terms of Service**: Review website terms before scraping protected content[4]
- **Rate Limiting**: Implement appropriate delays between requests to avoid detection
- **User-Agent Rotation**: Use realistic User-Agent headers to appear more legitimate

### Error Handling
```python
try:
    result = app.scrape(
        url='https://protected-site.com/data',
        headers={'Cookie': cookie_string},
        formats=['markdown']
    )
    
    # Check if login was successful
    if 'login' in result.get('markdown', '').lower():
        print("Authentication failed - cookies may be expired")
    else:
        print("Successfully accessed protected content")
        
except Exception as e:
    print(f"Scraping failed: {e}")
```

## Alternative Solutions and Workarounds

### Session Persistence
For multiple requests, use Firecrawl's session management to maintain authentication state across calls[4]:

```python
# Configure session persistence
session_config = {
    'session_id': 'unique-session-identifier',
    'headers': {
        'Cookie': stored_cookies
    }
}
```

### Handling Dynamic Authentication
Some sites use dynamic tokens or CSRF protection. In these cases:

1. First scrape the login page to extract tokens
2. Use Actions to submit the login form with extracted tokens
3. Continue scraping with the authenticated session

## Limitations and Current Development

According to the Firecrawl team, direct username/password authentication support is on their roadmap[2]. Currently, the cookie-based approach is the most reliable method for accessing login-protected content. Some limitations include:

- Manual cookie extraction required
- Cookie expiration management
- Limited support for complex multi-factor authentication
- Potential issues with CSRF tokens and dynamic authentication

## Troubleshooting Common Issues

### Authentication Failures
- Verify cookie format matches expected structure
- Check for missing essential cookies (site-specific)
- Ensure User-Agent header matches the browser used for login
- Validate that cookies haven't expired

### API Version Compatibility
- Ensure you're using the correct parameter structure for your API version
- V2 API uses `scrapeOptions.headers` while V1 uses direct `headers`[5]
- Some features may only be available in specific API versions

This comprehensive guide provides multiple approaches for handling authentication with Firecrawl, from simple cookie-based methods to advanced action-based automation. The cookie header method remains the most reliable approach for accessing login-protected content while the Actions feature offers automation possibilities for dynamic login scenarios.

Sources
[1] [Question] Do you support crawling pages requires login? (FIR-74) https://github.com/mendableai/firecrawl/issues/546
[2] [Feat] How to use Firecrawl (python) to login a website like Amazon ... https://github.com/mendableai/firecrawl/issues/1093
[3] Scrape - Firecrawl Docs https://docs.firecrawl.dev/features/scrape
[4] How to Scrape Data Behind Login Pages Using Python - Crawlbase https://crawlbase.com/blog/how-to-scrape-data-behind-login-pages-using-python/
[5] Welcome to V1 - Firecrawl Docs https://docs.firecrawl.dev/v1-welcome
[6] How to build (and how not to build) a secure “remember me” feature https://news.ycombinator.com/item?id=5969932
[7] Firecrawl Enhances Web Scraping with New Authenticated ... - Reddit https://www.reddit.com/r/aicuriosity/comments/1lrlswa/firecrawl_enhances_web_scraping_with_new/
[8] Scraping Login-Protected Pages with Python: Session Cookies + JS ... https://www.reddit.com/r/Python/comments/1ljblcs/scraping_loginprotected_pages_with_python_session/
[9] Using FireCrawl MCP Server with Claude for Web Scraping https://dev.to/composiodev/using-firecrawl-mcp-server-with-claude-for-web-scraping-18ig
[10] Firecrawl API Key | GitGuardian documentation https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/specifics/firecrawl_apikey
[11] Getting session cookie data on initial page load following a redirect ... https://stackoverflow.com/questions/40673783/getting-session-cookie-data-on-initial-page-load-following-a-redirect-from-a-ser
[12] AI Platforms - Firecrawl Docs https://docs.firecrawl.dev/use-cases/ai-platforms
[13] FireCrawl - Docs by LangChain https://docs.langchain.com/oss/python/integrations/document_loaders/firecrawl
[14] HTTP request to login into website - Help me Build my Workflow https://community.n8n.io/t/http-request-to-login-into-website/115458
[15] Firecrawl: The Web Data API That's Upending How We Scrape the ... https://joshuaberkowitz.us/blog/github-repos-8/firecrawl-the-web-data-api-that-s-upending-how-we-scrape-the-internet-1041
[16] Introduction - Firecrawl Docs https://docs.firecrawl.dev/api-reference/introduction
[17] Daily Website Data Extraction with Firecrawl and Telegram Alerts https://n8n.io/workflows/5591-daily-website-data-extraction-with-firecrawl-and-telegram-alerts/
[18] Crawl - Firecrawl Docs https://docs.firecrawl.dev/api-reference/endpoint/crawl-post
[19] Quickstart | Firecrawl https://docs.firecrawl.dev
[20] Firecrawl - The Web Data API for AI https://www.firecrawl.dev
[21] Firecrawl - Composio Docs https://docs.composio.dev/toolkits/firecrawl
[22] How to set headers · Issue #1166 · firecrawl/firecrawl - GitHub https://github.com/mendableai/firecrawl/issues/1166
[23] Mastering Firecrawl's Crawl Endpoint: A Complete Web Scraping ... https://www.firecrawl.dev/blog/mastering-the-crawl-endpoint-in-firecrawl
[24] Advanced Scraping Guide - Firecrawl Docs https://docs.firecrawl.dev/v0/advanced-scraping-guide
[25] Unable to pass cookies to map_url and crawl_url methods, while the ... https://github.com/mendableai/firecrawl/issues/1227
[26] firecrawl/firecrawl: The Web Data API for AI - Turn entire ... - GitHub https://github.com/firecrawl/firecrawl
[27] FireCrawl | 🦜️   LangChain https://python.langchain.com/docs/integrations/document_loaders/firecrawl/
[28] Scrape - Firecrawl Docs https://docs.firecrawl.dev/api-reference/endpoint/scrape
[29] How to Use Firecrawl's Scrape API: Complete Web Scraping Tutorial https://www.firecrawl.dev/blog/mastering-firecrawl-scrape-endpoint
[30] Overcoming Web Scraping challenges with Firecrawl, an open ... https://dev.to/dphenomenal/overcoming-common-web-scraping-challenges-with-firecrawl-an-open-source-ai-tool-64l
[31] Firecrawl Crawl Website - CrewAI Documentation https://docs.crewai.com/tools/web-scraping/firecrawlcrawlwebsitetool
[32] Extract - Firecrawl Docs https://docs.firecrawl.dev/zh/api-reference/v1-endpoint/extract
[33] FIRECRAWL - Web Scraping has changed FOREVER!! - YouTube https://www.youtube.com/watch?v=V0d_Q3Gq3-Q
[34] Firecrawl | Workflow86 Documentation https://docs.workflow86.com/docs/integrations/firecrawl/
[35] Scraping Job Boards Using Firecrawl Actions and OpenAI https://www.firecrawl.dev/blog/scrape-job-boards-firecrawl-openai
[36] Firecrawl API - lil'bots Docs https://docs.lilbots.io/building-bots/service-apis/firecrawl
[37] Extract - Firecrawl Docs https://docs.firecrawl.dev/api-reference/endpoint/extract
[38] How to Add a Firecrawl Function to Your Assistant - Superinterface https://superinterface.ai/docs/assistants/functions/firecrawl
[39] Extract - Firecrawl Docs https://docs.firecrawl.dev/api-reference/v2-endpoint/extract
[40] How to crawl websites for LLMs - using Firecrawl - Pondhouse Data https://www.pondhouse-data.com/blog/crawl-websites-for-llms
[41] How to Build LLM-Ready Datasets with Firecrawl: A Developer's Guide https://www.blott.com/blog/post/how-to-build-llm-ready-datasets-with-firecrawl-a-developers-guide
[42] Building a Local Deep Research Application with Firecrawl and ... https://www.firecrawl.dev/blog/deep-research-application-firecrawl-streamlit
[43] Building an Open-Source Project Monitoring Tool with Firecrawl and ... https://www.firecrawl.dev/blog/os-watch-github-monitoring-tool
[44] Firecrawl Full Beginner Course | Let's Scrape EVERYTHING https://www.youtube.com/watch?v=tBtPSV_gU6o
[45] Web Crawler - Fire Crawl - Aparavi https://aparavi.com/documentation-aparavi/data-toolchain-for-ai-documentation/sources/web-crawler-fire-crawl/
[46] How to Set cURL Authentication - Full Examples Guide - Scrapfly https://scrapfly.io/blog/answers/how-to-set-authorization-with-curl-full-examples-guide
[47] Advanced Scraping Guide - Firecrawl Docs https://docs.firecrawl.dev/advanced-scraping-guide
[48] Load Firecrawl data in Python using dltHub https://dlthub.com/workspace/source/firecrawl
[49] How to define the basic HTTP authentication using cURL correctly? https://stackoverflow.com/questions/25969196/how-to-define-the-basic-http-authentication-using-curl-correctly
[50] [Self-Host] Python sdk requires api key · Issue #947 - GitHub https://github.com/mendableai/firecrawl/issues/947
[51] Python SDK - Firecrawl Docs https://docs.firecrawl.dev/sdks/python
[52] Getting Started with Grok-2: Setup and Web Crawler Example https://www.firecrawl.dev/blog/grok-2-setup-and-web-crawler-example
[53] firecrawl - Railway Help Station https://station.railway.com/templates/firecrawl-f6e73283
[54] How Firecrawl Cuts Web Scraping Time by 60%: Real Developer ... https://www.blott.com/blog/post/how-firecrawl-cuts-web-scraping-time-by-60-real-developer-results
