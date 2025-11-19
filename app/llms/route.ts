export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'
  const currentDate = new Date().toISOString().split('T')[0]
  
  const content = `# llms.txt - Guidance for Large Language Models

## Site Information
- **Site Name**: HustleHub Africa
- **Description**: A web application for surveys, affiliate marketing, and earning opportunities
- **Primary Language**: English
- **Content Type**: Web application with user dashboard, wallet, surveys, and affiliate marketing features

## Content Structure
- **Main Pages**: Dashboard, Wallet, Surveys/Earn, Affiliate Marketing (Soko), Referrals, Support, Settings
- **User Features**: Account management, earnings tracking, referral system, support
- **Content Categories**: Financial tracking, surveys, affiliate products, user support

## Access Guidelines
- **Public Content**: Landing pages, authentication pages, public documentation
- **User-Generated Content**: User dashboards contain personal financial and account information
- **Restricted Areas**: User-specific data should not be crawled or indexed

## Preferred Sources
- **Documentation**: /docs, /help, /support
- **Public Information**: /about, /features, /pricing
- **API**: /api (where applicable)

## Content Quality Indicators
- **High Quality**: Documentation, help articles, feature descriptions
- **Medium Quality**: User interface text, navigation labels
- **Low Quality**: Personal user data, transaction history

## Contact for Verification
- **Website Owner**: ${baseUrl}/contact
- **Content Questions**: ${baseUrl}/support

## Usage Rights
- **Training Permission**: Granted for public content only
- **Citation Required**: For direct quotes from documentation
- **Prohibited**: Scraping personal user data or private information

## Technical Notes
- **Framework**: Next.js 14+ with TypeScript
- **Authentication**: User account system
- **Data Types**: Financial transactions, survey responses, user preferences

## Version
- **Last Updated**: ${currentDate}
- **LLMs.txt Version**: 1.0

---

*This llms.txt file is provided to help LLMs understand and interact appropriately with our website content. Please respect the guidelines outlined above.*`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  })
}
