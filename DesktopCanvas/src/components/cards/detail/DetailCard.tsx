import React from 'react'
import type { CardState } from '../../../store/useCardStore'
import { VideoPlayer } from './VideoPlayer'

interface DetailCardProps {
  data: CardState
}

export const DetailCard: React.FC<DetailCardProps> = ({ data }) => {
  return (
    <div className="flex flex-col h-full">
        <div className="bg-black w-full aspect-video flex items-center justify-center text-white shrink-0 relative">
            {data.content?.bvid ? (
                <VideoPlayer bvid={data.content.bvid} cid={data.content.cid} />
            ) : (
                 <div className="flex flex-col items-center">
                    {data.content?.pic && (
                        <img src={data.content.pic} className="w-full h-full object-contain opacity-50 absolute inset-0" />
                    )}
                    <span className="z-10 relative">Video Unavailable</span>
                 </div>
            )}
        </div>
        <div className="p-4 flex-1 overflow-auto">
            <h1 className="text-xl font-bold mb-2">{data.content?.title || 'Video Title'}</h1>
            <div className="flex gap-2 mb-4">
                <span className="text-sm text-gray-500">{data.content?.owner?.name}</span>
                <span className="text-sm text-gray-500">{data.content?.stat?.view} views</span>
            </div>
            <p className="text-gray-600">
                {data.content?.desc || 'No description.'}
            </p>
        </div>
    </div>
  )
}
