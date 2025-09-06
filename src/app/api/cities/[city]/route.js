import { NextResponse } from 'next/server';
import { getCityData } from '../../../../lib/data-utils.js';

export async function GET(request, { params }) {
  try {
    const { city } = await params;
    
    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    const cityData = await getCityData(city);
    
    if (!cityData) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(cityData);
  } catch (error) {
    console.error('Error fetching city data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 