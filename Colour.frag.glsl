precision highp float;
uniform float3 Colour;

uniform bool MuteColour;
uniform bool InvertColour;

varying float3 WorldPosition;



void main()
{
	gl_FragColor = float4( Colour.xyz, 1 );

	if ( MuteColour )
		gl_FragColor.xyz = Colour.xxx;
	else if ( InvertColour )
		gl_FragColor.xyz = Colour.zxy;
}


