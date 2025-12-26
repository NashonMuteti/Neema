"use client";

import React from "react";

interface MyContributionsHeaderProps {
  title: string;
  description: string;
}

const MyContributionsHeader: React.FC<MyContributionsHeaderProps> = ({ title, description }) => {
  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="text-lg text-muted-foreground">{description}</p>
    </>
  );
};

export default MyContributionsHeader;