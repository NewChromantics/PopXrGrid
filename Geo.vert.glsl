attribute float3 LocalPosition;
attribute float3 LocalUv;
attribute float3 LocalNormal;
varying float3 FragWorldPosition;
varying float3 FragLocalPosition;
varying float2 FragLocalUv;
varying vec3 FragCameraPosition;	//	position in camera space
varying vec2 FragViewUv;
varying vec3 ClipPosition;
varying float TriangleIndex;
varying vec3 FragColour;
varying vec3 FragLocalNormal;
varying vec3 FragWorldNormal;

attribute vec3 WorldPosition;
//attribute mat4 LocalToWorldTransform;
#define LocalToWorldTransform mat4( 1,0,0,0,	\
									0,1,0,0,	\
									0,0,1,0,	\
									WorldPosition,1 )
									
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
attribute vec3 Colour;

void main()
{
	float3 LocalPos = LocalPosition;
	
	float4 WorldPos = LocalToWorldTransform * float4(LocalPos,1);
	float4 CameraPos = WorldToCameraTransform * WorldPos;	//	world to camera space
	float4 ProjectionPos = CameraProjectionTransform * CameraPos;

	gl_Position = ProjectionPos;
	
	FragViewUv = gl_Position.xy;
	ClipPosition = gl_Position.xyz / gl_Position.www;	//	not sure if this should divide...
	
	FragCameraPosition = CameraPos.xyz ;/// CameraPos.www;

	FragWorldNormal = (LocalToWorldTransform * vec4(LocalNormal,0.0)).xyz;
	FragLocalNormal = LocalNormal;	
	FragWorldPosition = WorldPos.xyz;
	//FragColour = Colour;//LocalPosition;
	FragColour = float3( LocalUv );
	FragLocalPosition = LocalPosition;
	FragLocalUv = LocalUv.xy;
	TriangleIndex = LocalUv.z;
	FragColour = Colour;
}

