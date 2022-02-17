precision highp float;
varying vec3 FragColour;

uniform bool MuteColour;
uniform bool InvertColour;

uniform sampler2D DepthTexture;
uniform mat4 NormalDepthToViewDepthTransform;
uniform mat4 CameraToWorldTransform;
uniform mat4 ProjectionToCameraTransform;

varying vec3 FragWorldPosition;
varying vec2 FragLocalUv;
varying vec2 FragViewUv;
varying vec3 ClipPosition;

varying vec3 FragCameraPosition;

const float ValueToMetres = 0.0010000000474974513;

float GetViewDepth()
{
	//	view uv (-1...1) to 0...1
	vec2 UvNormalised = (FragViewUv + 1.0) / 2.0;

	//	texture is rotated
	//	would be nice to fix this in upload, but really should be part of the transform
	//UvNormalised = vec2( 1.0-UvNormalised.y, 1.0-UvNormalised.x );
	UvNormalised = vec2( UvNormalised.x, 1.0 - UvNormalised.y );

	//	gr: I think this is correct - do a projection correction for screen->depth texture
	//		to get proper coords
	vec4 DepthUv4 = NormalDepthToViewDepthTransform * vec4( UvNormalised, 0.0, 1.0 );
	vec2 DepthUv = DepthUv4.xy;

	
	float Depth = texture2D( DepthTexture, DepthUv ).x;
	Depth *= ValueToMetres;
	return Depth;
}


vec3 GetSceneCameraPosition()
{
	//	depth in viewport space so 0...1, leave it at that
	vec2 xy = ClipPosition.xy;
	vec2 uv = (xy + 1.0 ) / 2.0;	//	0...1
	
	//	this depth needs to be normalised to be in camera projection space...
	//float Depth = texture2D(SceneDepthTexture, uv).x;	//	already 0...1
	float Depth = 1.0;

	vec3 xyz = mix( vec3(-1,-1,-1), vec3(1,1,1), vec3(uv,Depth) );
	vec4 ProjectionPos = vec4( xyz, 1 );
	
	vec4 CameraPos = ProjectionToCameraTransform * ProjectionPos;
	vec3 CameraPos3 = CameraPos.xyz / CameraPos.www;
	
	//	CameraPos3 is end of ray
	float ViewDepthMetres = GetViewDepth();
	CameraPos3 = normalize(CameraPos3);
	CameraPos3 *= ViewDepthMetres;
	
	return CameraPos3;
}

vec3 GetSceneWorldPosition()
{
	vec3 CameraPos = GetSceneCameraPosition();
	vec4 WorldPos = CameraToWorldTransform * vec4(CameraPos,1);
	vec3 WorldPos3 = WorldPos.xyz / WorldPos.www;
	return WorldPos3;
}



void main()
{
	gl_FragColor.w = 1.0;
	
	#define HAS_DEPTH	false
	if ( !HAS_DEPTH )
	{
		gl_FragColor.xyz = FragColour;
		return;
	}
	
	vec4 BEHIND_COLOUR = vec4(1,0,0,0.1);
	vec4 INFRONT_COLOUR = vec4(FragLocalUv,0,1);
	/*
	vec4 CameraWorldPosition4 = CameraToWorldTransform * vec4(0,0,0,1);
	vec3 CameraWorldPosition = CameraWorldPosition4.xyz / CameraWorldPosition4.www;
	vec3 SceneWorldPosition = GetSceneWorldPosition();
	
	float DistanceToFrag = length(WorldPosition-CameraWorldPosition);
	float DistanceToRealWorld = length(SceneWorldPosition-CameraWorldPosition);
	*/

	float FragDistance = -FragCameraPosition.z;
	float RealDistance = GetViewDepth();
	gl_FragColor.xyz = vec3(FragDistance,0.0,RealDistance);
	
	if ( FragDistance < 0.001 )
		gl_FragColor = vec4(1,1,0,1);
	if ( FragDistance < 0.0 )
		gl_FragColor = vec4(0,1,1,1);

	if ( FragDistance < RealDistance )
	{
		gl_FragColor = INFRONT_COLOUR;
		gl_FragColor.xyz *= RealDistance;
	}
	else
	{
		gl_FragColor = BEHIND_COLOUR;
		gl_FragColor.xyz *= RealDistance;
		discard;
	}

	/*
	//	clipped by scene
	//	gr: tolerance so we dont clip when rendering the scene test billboards
	float Tolerance = 0.0001;
	if ( SceneCameraPosition.z+Tolerance < CameraPosition.z )
	{
		gl_FragColor = vec4(1,0,0,1);
		discard;
		return;
	}
	
	if ( WorldPosition

	gl_FragColor = vec4( Colour.xyz, 1 );

	if ( MuteColour )
		gl_FragColor.xyz = Colour.xxx;
	else if ( InvertColour )
		gl_FragColor.xyz = Colour.zxy;
	
	float Depth = GetWorldDepth();
	gl_FragColor.xyz = vec3(Depth,Depth,Depth);
	*/
}


