import { createHmac } from 'crypto';
import * as crypto from 'crypto';
import { Like } from 'typeorm';
import { Workbook } from 'exceljs';
import { Response } from 'express';
import * as fs from 'fs';
import { BadRequestException, HttpException } from '@nestjs/common';
import { bannerDesciptionImageSize } from 'src/constants/constants';

export function toBool(value: string): boolean {
  return value === 'true';
}

export function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

export const generateRandomSixDigitsNumber = () => {
  const min = 100000;
  const max = 999999;

  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const decorateApiResponse = (dto: any, response: any) => {
  return response.length <= 0
    ? [new dto()]
    : response.map((q) => Object.assign(new dto(), q));
};

export function deleteKeyFromObject(obj, key) {
  return delete obj[key];
}

export function getSlug(name): string {
  let slug = name;
  slug = slug.replace(/'/g, '');
  slug = slug.replace(/[^a-zA-Z0-9]/g, '-');
  return slug.toLowerCase();
}

export function createHashDigest(algorithm, secretKey, body) {
  return createHmac(algorithm, secretKey).update(body.toString()).digest('hex');
}

export function formatDateISOString(date: string) {
  return `${date.split('T')[0]} ${date.split('T')[1]}`;
}

export function generateStrongPassword(length = 8): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@#$!%*?&';
  const alphabets = upper + lower;

  const chars = [
    upper[crypto.randomInt(0, upper.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    special[crypto.randomInt(0, special.length)],
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(alphabets[crypto.randomInt(0, alphabets.length)]);
  }

  return chars.sort(() => 0.5 - Math.random()).join('');
}

export function calculateYearDifference(dateString: string): number {
  const givenDate = new Date(dateString);
  if (isNaN(givenDate.getTime())) {
    throw new Error('Invalid date format, expected YYYY-MM-DD');
  }

  const today = new Date();
  let years = today.getFullYear() - givenDate.getFullYear();

  // Adjust if the current date is before the current date in this year
  const hasDatePassed =
    today.getMonth() > givenDate.getMonth() ||
    (today.getMonth() === givenDate.getMonth() &&
      today.getDate() >= givenDate.getDate());

  if (!hasDatePassed) {
    years--;
  }

  return years;
}

// ================= BASE64 VALIDATION =================
export function validateBase64Images(description: string, imageLimit: number) {
  if (!description) return;

  // ✅ check if base64 image exists at all
  if (!description.includes('data:image')) return true;

  const base64Images =
    description.match(/data:image\/(png|jpg|jpeg);base64,([^\"]+)/g) || [];

  // ✅ if no valid base64 pattern found → skip
  if (base64Images.length === 0) return;

  base64Images.forEach((img) => {
    const base64Data = img.split(',')[1];
    if (!base64Data) return;

    const size = Buffer.from(base64Data, 'base64').length;

    if (size > imageLimit * 1024 * 1024) {
      throw new BadRequestException(
        `Each image in description must not exceed ${imageLimit}MB`,
      );
    }
  });
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase() // ✅ lowercase
    .trim() // remove spaces start/end
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-') // spaces → hyphen
    .replace(/-+/g, '-'); // multiple hyphens → single
}
