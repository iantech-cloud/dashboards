// components/writerbio.tsx - FIXED AVATAR PATH
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Mail, Linkedin, Twitter, Globe, Facebook, MessageCircle, Phone } from 'lucide-react';

interface WriterBioProps {
  name: string;
  bio: string;
  avatar?: string;
  expertise: string[];
  email?: string;
  twitter?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  phone?: string;
  linkedin?: string;
  postsCount?: number;
}

export function WriterBio({ 
  name, 
  bio, 
  avatar = "/writer-avatar.png", // CORRECT PATH - no /public/
  expertise, 
  email = "waiganjoian51@gmail.com",
  twitter = "IanMuiruri15",
  facebook = "https://www.facebook.com/share/19qVdp7RGC/",
  tiktok = "i____devvs",
  website = "hustlehubafrica.com",
  phone = "+254748264231",
  linkedin = "",
  postsCount 
}: WriterBioProps) {
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [imageError, setImageError] = useState(false);
  const displayedSkills = showAllSkills ? expertise : expertise.slice(0, 4);

  // Handle image loading error with better fallback
  const handleImageError = () => {
    console.warn(`Avatar image failed to load: ${avatar}`);
    setImageError(true);
  };

  // Get valid avatar source
  const getAvatarSrc = () => {
    if (imageError) return null;
    
    // Remove any /public/ prefix if present
    const cleanAvatar = avatar?.replace(/^\/public\//, '/');
    return cleanAvatar;
  };

  const avatarSrc = getAvatarSrc();

  // Social media links configuration
  const socialLinks = [
    {
      platform: 'email',
      href: `mailto:${email}`,
      icon: <Mail className="w-5 h-5" />,
      title: `Email ${name}`,
      color: 'hover:bg-blue-100 group-hover:text-blue-600'
    },
    {
      platform: 'whatsapp',
      href: `https://wa.me/${phone.replace(/\D/g, '')}`,
      icon: <MessageCircle className="w-5 h-5" />,
      title: `Chat with ${name} on WhatsApp`,
      color: 'hover:bg-green-100 group-hover:text-green-600'
    },
    {
      platform: 'phone',
      href: `tel:${phone}`,
      icon: <Phone className="w-5 h-5" />,
      title: `Call ${name}`,
      color: 'hover:bg-green-100 group-hover:text-green-600'
    },
    {
      platform: 'twitter',
      href: `https://twitter.com/${twitter.replace('@', '')}`,
      icon: <Twitter className="w-5 h-5" />,
      title: `Follow ${name} on Twitter/X`,
      color: 'hover:bg-black hover:bg-opacity-10 group-hover:text-black'
    },
    {
      platform: 'facebook',
      href: facebook,
      icon: <Facebook className="w-5 h-5" />,
      title: `Follow ${name} on Facebook`,
      color: 'hover:bg-blue-100 group-hover:text-blue-600'
    },
    {
      platform: 'tiktok',
      href: `https://www.tiktok.com/@${tiktok.replace('@', '')}`,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      ),
      title: `Follow ${name} on TikTok`,
      color: 'hover:bg-black hover:bg-opacity-10 group-hover:text-black'
    },
    {
      platform: 'website',
      href: `https://${website.replace(/^https?:\/\//, '')}`,
      icon: <Globe className="w-5 h-5" />,
      title: `Visit ${website}`,
      color: 'hover:bg-purple-100 group-hover:text-purple-600'
    }
  ];

  // Add LinkedIn only if provided
  if (linkedin) {
    socialLinks.push({
      platform: 'linkedin',
      href: linkedin,
      icon: <Linkedin className="w-5 h-5" />,
      title: `Connect with ${name} on LinkedIn`,
      color: 'hover:bg-blue-100 group-hover:text-blue-600'
    });
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar with fallback */}
          <div className="relative">
            {avatarSrc && !imageError ? (
              <Image
                src={avatarSrc}
                alt={`${name} - Cybersecurity Expert & Developer`}
                width={96}
                height={96}
                className="rounded-full border-4 border-blue-100 shadow-lg object-cover"
                priority={false}
                loading="lazy"
                onError={handleImageError}
                quality={85}
              />
            ) : (
              // Fallback avatar if image fails to load
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg border-4 border-blue-100">
                <span className="text-white font-bold text-lg">
                  {name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Name and Bio */}
          <div>
            <h3 className="font-bold text-xl text-slate-900 mb-1">{name}</h3>
            <p className="text-slate-600 text-sm leading-relaxed max-w-sm">{bio}</p>
          </div>

          {/* Expertise Tags */}
          <div className="w-full">
            <div className="flex flex-wrap gap-2 justify-center mb-2">
              {displayedSkills.map((skill) => (
                <span 
                  key={skill}
                  className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-sm transition-transform duration-200 hover:scale-105"
                >
                  {skill}
                </span>
              ))}
            </div>
            
            {/* Show More/Less Toggle */}
            {expertise.length > 4 && (
              <button
                onClick={() => setShowAllSkills(!showAllSkills)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200 mx-auto block hover:underline"
              >
                {showAllSkills ? 'Show less' : `+${expertise.length - 4} more skills`}
              </button>
            )}
          </div>

          {/* Stats */}
          {postsCount && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl px-4 py-2 border border-blue-200">
              <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <span className="text-lg">📚</span>
                {postsCount} article{postsCount !== 1 ? 's' : ''} published
              </p>
            </div>
          )}

          {/* Social Links */}
          <div className="w-full">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Connect with me
            </h4>
            <div className="flex flex-wrap gap-2 justify-center">
              {socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.href}
                  title={link.title}
                  target={link.platform !== 'email' && link.platform !== 'phone' ? '_blank' : undefined}
                  rel={link.platform !== 'email' && link.platform !== 'phone' ? 'noopener noreferrer' : undefined}
                  className={`p-3 bg-slate-100 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md group ${link.color} border border-slate-200`}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Contact Info Summary */}
          <div className="text-xs text-slate-600 space-y-2 bg-slate-50 rounded-lg px-4 py-3 w-full border border-slate-200">
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 text-green-500" />
              <span className="font-medium">{phone}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
