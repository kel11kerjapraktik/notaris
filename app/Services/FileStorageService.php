<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileStorageService
{
    /**
     * Store an uploaded file on the configured filesystem disk (local in dev, s3 in Laravel Cloud).
     *
     * @return array{disk: string, path: string, name: string, mime: string, size: int}
     */
    public function store(UploadedFile $file, string $directory): array
    {
        $disk = (string) config('filesystems.default', 'local');
        $extension = $file->getClientOriginalExtension() ?: $file->extension() ?: 'bin';
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = trim($directory, '/').'/'.$filename;

        Storage::disk($disk)->putFileAs(trim($directory, '/'), $file, $filename, [
            'visibility' => 'private',
        ]);

        return [
            'disk' => $disk,
            'path' => $path,
            'name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size' => (int) $file->getSize(),
        ];
    }

    public function delete(?string $disk, ?string $path): void
    {
        if (! $path) {
            return;
        }

        $targetDisk = $disk ?: (string) config('filesystems.default', 'local');

        if (Storage::disk($targetDisk)->exists($path)) {
            Storage::disk($targetDisk)->delete($path);
        }
    }

    public function serve(string $disk, string $path, string $downloadName, bool $download = false): StreamedResponse
    {
        abort_unless(Storage::disk($disk)->exists($path), 404, 'Berkas tidak ditemukan di penyimpanan.');

        if ($download) {
            return Storage::disk($disk)->download($path, $downloadName);
        }

        return Storage::disk($disk)->response($path, $downloadName);
    }
}
