precision highp float;
uniform vec3 Colour;

uniform bool MuteColour;
uniform bool InvertColour;

uniform sampler2D DepthTexture;

varying vec3 WorldPosition;
varying vec2 FragLocalUv;

const float ValueToMetre = 0.0010000000474974513;

void main()
{
	gl_FragColor = vec4( Colour.xyz, 1 );

	if ( MuteColour )
		gl_FragColor.xyz = Colour.xxx;
	else if ( InvertColour )
		gl_FragColor.xyz = Colour.zxy;
	
	
	//	gr: need to use proper matrix to convert depth
	//	rotated
	vec2 DepthUv = vec2( 1.0-FragLocalUv.y, 1.0-FragLocalUv.x );
	float Depth = texture2D( DepthTexture, DepthUv ).x;
	Depth *= ValueToMetre;
	gl_FragColor.xyz = vec3(Depth,Depth,Depth);
}


