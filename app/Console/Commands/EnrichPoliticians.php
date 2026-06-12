<?php

namespace App\Console\Commands;

use App\Models\Constituency;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class EnrichPoliticians extends Command
{
    protected $signature = 'enrich:politicians
        {--map= : Path to enrichment_map.json (default: chittar_data/enrichment/enrichment_map.json)}
        {--photos : Also copy photo files into public storage}
        {--dry-run : Preview changes without saving}';

    protected $description = 'Import scraped enrichment data (bio, email, phone, facebook, photos) into politicians table';

    public function handle(): int
    {
        $mapPath = $this->option('map') ?? base_path('chittar_data/enrichment/enrichment_map.json');

        if (!file_exists($mapPath)) {
            $this->error("Map file not found: {$mapPath}");
            return 1;
        }

        $map = json_decode(file_get_contents($mapPath), true);
        if (!$map) {
            $this->error('Failed to parse enrichment map JSON.');
            return 1;
        }

        $this->info('Loaded ' . count($map) . ' entries from enrichment map.');

        $dryRun     = $this->option('dry-run');
        $copyPhotos = $this->option('photos');

        $stats = [
            'total'   => count($map),
            'updated' => 0,
            'skipped' => 0,
            'no_term' => 0,
            'photos'  => 0,
        ];

        $bar = $this->output->createProgressBar(count($map));
        $bar->start();

        foreach ($map as $constituencyCode => $entry) {
            $constituency = Constituency::where('code', $constituencyCode)->first();
            if (!$constituency) {
                $stats['no_term']++;
                $bar->advance();
                continue;
            }

            $term = Term::where('constituency_id', $constituency->id)
                ->where('is_current', true)
                ->first();

            if (!$term) {
                $stats['no_term']++;
                $bar->advance();
                continue;
            }

            $politician = Politician::find($term->politician_id);
            if (!$politician) {
                $stats['skipped']++;
                $bar->advance();
                continue;
            }

            $updates = [];

            if (!empty($entry['bio']) && empty($politician->bio)) {
                $updates['bio'] = $entry['bio'];
            }
            if (!empty($entry['email']) && empty($politician->email)) {
                $updates['email'] = $entry['email'];
            }
            if (!empty($entry['phone']) && empty($politician->phone)) {
                $updates['phone'] = $entry['phone'];
            }
            if (!empty($entry['facebook_url']) && empty($politician->facebook_url)) {
                $updates['facebook_url'] = $entry['facebook_url'];
            }
            if (!empty($entry['source'])) {
                $updates['data_source'] = $entry['source'];
            }

            if ($copyPhotos && !empty($entry['photo_local_path']) && empty($politician->photo_path)) {
                $srcPath = base_path($entry['photo_local_path']);
                if (file_exists($srcPath)) {
                    $ext      = pathinfo($srcPath, PATHINFO_EXTENSION);
                    $destName = 'politicians/' . $politician->id . '.' . $ext;
                    if (!$dryRun) {
                        Storage::disk('public')->put($destName, file_get_contents($srcPath));
                    }
                    $updates['photo_path'] = $destName;
                    $stats['photos']++;
                }
            }

            if (!empty($updates)) {
                if (!$dryRun) {
                    $politician->update($updates);
                }
                $stats['updated']++;
            } else {
                $stats['skipped']++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        if ($dryRun) {
            $this->warn('DRY RUN — no changes saved.');
        }

        $this->table(
            ['Stat', 'Count'],
            [
                ['Total entries in map',       $stats['total']],
                ['Politicians updated',         $stats['updated']],
                ['Already had data (skipped)', $stats['skipped']],
                ['Constituency/term not found', $stats['no_term']],
                ['Photos copied',              $stats['photos']],
            ]
        );

        return 0;
    }
}
