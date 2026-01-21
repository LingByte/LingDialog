import React from 'react'
import Navbar from './Navbar'

interface LayoutProps {
  children: React.ReactNode
  showNavbar?: boolean
}

const Layout: React.FC<LayoutProps> = ({ children, showNavbar = true }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? 'pt-0' : ''}>
        {children}
      </main>
    </div>
  )
}

export default Layout