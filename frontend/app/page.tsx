"use client";

import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidV4 } from "uuid";
import { Button } from "@/components/ui/button";
import Home from "./home";

export default function Page() {
  return <Home />;
}