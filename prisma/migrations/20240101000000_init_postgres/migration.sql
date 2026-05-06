-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "qrX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "qrY" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "qrScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "marginMode" TEXT NOT NULL DEFAULT 'both',
    "barcodeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "barcodeAllPages" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAssignment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- Many-to-many: User <-> UserGroup
CREATE TABLE "_UserToUserGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Unique constraints
CREATE UNIQUE INDEX "User_displayId_key"  ON "User"("displayId");
CREATE UNIQUE INDEX "User_username_key"   ON "User"("username");
CREATE UNIQUE INDEX "UserGroup_name_key"  ON "UserGroup"("name");
CREATE UNIQUE INDEX "_UserToUserGroup_AB_unique" ON "_UserToUserGroup"("A", "B");
CREATE INDEX "_UserToUserGroup_B_index"   ON "_UserToUserGroup"("B");

-- Foreign keys
ALTER TABLE "Category"        ADD CONSTRAINT "Category_parentId_fkey"           FOREIGN KEY ("parentId")    REFERENCES "Category"("id")    ON DELETE SET NULL  ON UPDATE CASCADE;
ALTER TABLE "Document"        ADD CONSTRAINT "Document_categoryId_fkey"          FOREIGN KEY ("categoryId")  REFERENCES "Category"("id")    ON DELETE SET NULL  ON UPDATE CASCADE;
ALTER TABLE "Assignment"      ADD CONSTRAINT "Assignment_userId_fkey"            FOREIGN KEY ("userId")      REFERENCES "User"("id")        ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "Assignment"      ADD CONSTRAINT "Assignment_documentId_fkey"        FOREIGN KEY ("documentId")  REFERENCES "Document"("id")    ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "GroupAssignment" ADD CONSTRAINT "GroupAssignment_groupId_fkey"      FOREIGN KEY ("groupId")     REFERENCES "UserGroup"("id")   ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "GroupAssignment" ADD CONSTRAINT "GroupAssignment_documentId_fkey"   FOREIGN KEY ("documentId")  REFERENCES "Document"("id")    ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "_UserToUserGroup" ADD CONSTRAINT "_UserToUserGroup_A_fkey"          FOREIGN KEY ("A")           REFERENCES "User"("id")        ON DELETE CASCADE   ON UPDATE CASCADE;
ALTER TABLE "_UserToUserGroup" ADD CONSTRAINT "_UserToUserGroup_B_fkey"          FOREIGN KEY ("B")           REFERENCES "UserGroup"("id")   ON DELETE CASCADE   ON UPDATE CASCADE;
