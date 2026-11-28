<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class DatabaseSearch
{
    /**
     * Apply a case-insensitive LIKE comparison compatible with PostgreSQL, MySQL, and SQLite.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public static function whereLike(Builder $query, string $column, string $term, string $boolean = 'and'): Builder
    {
        $pattern = '%'.self::escapeLike($term).'%';
        $driver = $query->getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            return $query->where($column, 'ilike', $pattern, $boolean);
        }

        $wrapped = $query->getGrammar()->wrap($column);

        return $query->whereRaw("LOWER({$wrapped}) LIKE LOWER(?)", [$pattern], $boolean);
    }

    /**
     * Apply a case-insensitive OR LIKE comparison across multiple columns.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @param  array<int, string>  $columns
     * @return Builder<TModel>
     */
    public static function orWhereLikeAny(Builder $query, array $columns, string $term): Builder
    {
        foreach ($columns as $index => $column) {
            self::whereLike($query, $column, $term, $index === 0 ? 'and' : 'or');
        }

        return $query;
    }

    private static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
