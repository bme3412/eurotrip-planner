import { NextResponse } from 'next/server';
import { getAllCities, searchCities, getCitiesByCountry } from '@/lib/data-utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    const limit = parseInt(searchParams.get('limit')) || 50;

    let cities;

    if (search) {
      cities = await searchCities(search, limit);
    } else if (country) {
      cities = await getCitiesByCountry(country);
    } else {
      cities = await getAllCities();
    }

    return NextResponse.json({
      success: true,
      data: cities,
      count: cities.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in cities API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cities',
        message: error.message 
      },
      { status: 500 }
    );
  }
} 