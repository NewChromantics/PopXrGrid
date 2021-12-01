attribute float3 LocalPosition;
attribute float3 LocalUv;
varying float3 FragColour;
varying float3 WorldPosition;
varying float3 FragLocalPosition;
varying float2 FragLocalUv;
varying float TriangleIndex;

uniform mat4 LocalToWorldTransform;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
uniform float3 Colour;

void main()
{
	float3 LocalPos = LocalPosition;
	
	float4 WorldPos = LocalToWorldTransform * float4(LocalPos,1);
	float4 CameraPos = WorldToCameraTransform * WorldPos;	//	world to camera space
	float4 ProjectionPos = CameraProjectionTransform * CameraPos;

	gl_Position = ProjectionPos;
	
	WorldPosition = WorldPos.xyz;
	//FragColour = Colour;//LocalPosition;
	FragColour = float3( LocalUv );
	FragLocalPosition = LocalPosition;
	FragLocalUv = LocalUv.xy;
	TriangleIndex = LocalUv.z;
}

