import Pop from './PopEngine/PopEngine.js'
import FrameCounter_t from './PopEngine/FrameCounter.js'


async function GetRenderCommands(RenderContext)
{
	const SetRenderTarget = ['SetRenderTarget',null,[1,1,0]];

	const Commands = [ SetRenderTarget ];
	
	return Commands;
}

async function RenderLoop(Canvas)
{
	const RenderView = new Pop.Gui.RenderView(null,Canvas);
	const RenderContext = new Pop.Sokol.Context(RenderView);
	const FrameCounter = new FrameCounter_t(`Render`);
	
	while ( RenderView )
	{
		const Commands = await GetRenderCommands(RenderContext);
		await RenderContext.Render(Commands);
		FrameCounter.Add();
	}
}

export default async function Bootup()
{
	await RenderLoop('Window');
}
